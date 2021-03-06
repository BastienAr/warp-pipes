/**
 * Chunk test file
 */
import { expect } from 'chai';
import * as Chance from 'chance';
import * as e2p from 'event-to-promise';
import * as _ from 'lodash';
import { Transform } from 'stream';
import { ReadableMock, WritableMock } from 'stream-mock';
import { Chunk } from '../../src/transformers';

describe('chunk', () => {
  let chance;

  before(() => {
    chance = new Chance();
  });

  it('should be an instance of Transform stream', () => {
    const chunk = new Chunk(10);
    expect(chunk).to.be.an.instanceOf(Transform);
  });

  context('object mode', () => {
    const opt = { objectMode: true };
    const count = 100;
    let data: _.LoDashImplicitWrapper<number[]>;
    let source: ReadableMock;
    let sink: WritableMock;

    const drained = async () => e2p(sink, 'finish');

    beforeEach(() => {
      data = _([]).range(100);
      source = new ReadableMock(data, opt);
      sink = new WritableMock(opt);
    });

    it('should chunk array', async () => {
      const chunkCount = 10;
      const chunk = new Chunk(chunkCount, opt);
      source.pipe(chunk).pipe(sink);
      await drained();
      expect(sink.data.length).to.equals(Math.ceil(count / chunkCount));
      expect(sink.flatData).to.deep.equals(data.value());
    });

    it('should send the remaining elements', async () => {
      const chunkCount = 8;
      const chunk = new Chunk(chunkCount, opt);
      source.pipe(chunk).pipe(sink);
      await drained();
      const sinkData: any[] = sink.data;
      const rest = _.last(sinkData);
      expect(sink.data.length).to.equals(Math.ceil(count / chunkCount));
      expect(rest.length, 'Rest size').to.equal(count % chunkCount);
      expect(rest).to.deep.equal(data.takeRight(count % chunkCount).value());
      expect(sink.flatData).to.deep.equals(data.value());
    });
  });

  context('normal (Buffer) mode', () => {
    const length = 100;
    let data: Buffer[];
    let source: ReadableMock;

    beforeEach(() => {
      data = [chance.buffer({ length })];
      source = new ReadableMock(data);
    });

    it('should split buffer by chunk', async () => {
      const chunkCount = 10;
      let offset = 0;
      const chunk = new Chunk(chunkCount);
      const bufData = _.first(data);
      source.pipe(chunk);
      chunk.on('data', buf => {
        const expected = Buffer.alloc(chunkCount);
        bufData.copy(expected, 0, offset);
        offset += chunkCount;
        expect(buf.length).to.equals(chunkCount);
        expect(buf).to.deep.equals(expected);
      });
      await e2p(chunk, 'end');
    });

    it('should send last buffer with a smaller length', async () => {
      const chunkCount = 8;
      const chunk = new Chunk(chunkCount);
      const bufData = _.first(data);
      let idx = 0;
      source.pipe(chunk);
      chunk.on('data', buf => {
        if (idx >= Math.floor(length / chunkCount)) {
          const restLength = length % chunkCount;
          const expected = Buffer.alloc(restLength);
          bufData.copy(expected, 0, bufData.length - restLength);
          expect(buf.length).to.equals(restLength);
          expect(buf).to.deep.equals(expected);
        }
        idx += 1;
      });
      await e2p(chunk, 'end');
    });
  });
});
