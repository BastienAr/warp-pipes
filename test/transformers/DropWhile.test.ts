/**
 * DropWhile test file
 */
import { expect } from 'chai';
import * as Chance from 'chance';
import * as e2p from 'event-to-promise';
import * as _ from 'lodash';
import * as sinon from 'sinon';
import { Transform } from 'stream';
import { ReadableMock, WritableMock } from 'stream-mock';
import { DropWhile } from '../../src/transformers';

describe('drop while', () => {
  let chance;

  before(() => {
    chance = new Chance();
  });

  it('should be an instance of Transform stream', () => {
    const blocker = new DropWhile(_.identity);
    expect(blocker).to.be.an.instanceOf(Transform);
  });

  it('should send correct args to callback', async () => {
    const str = chance.string();
    const spy = sinon.spy(() => true);
    const stream = new DropWhile(spy);
    const source = new ReadableMock(str);
    const sink = new WritableMock();
    source.pipe(stream).pipe(sink);

    await e2p(sink, 'finish');
    const expected = _([])
      .range(str.length)
      .map(idx => [Buffer.from(str.charAt(idx)), idx]);
    expect(spy.args).to.have.deep.members(expected.value());
  });

  context('object mode', () => {
    const opt = { objectMode: true };
    let data;
    let source: ReadableMock;
    let sink: WritableMock;

    const drained = async () => e2p(sink, 'finish');

    beforeEach(() => {
      data = _.range(100);
      source = new ReadableMock(data, opt);
      sink = new WritableMock(opt);
    });

    it('should block data while condition is met', async () => {
      const lte50 = v => v <= 50;
      const blocker = new DropWhile(lte50, opt);
      source.pipe(blocker).pipe(sink);
      await drained();
      const expected = _.dropWhile(data, lte50);
      expect(sink.data).to.have.members(expected);
    });
  });

  context('normal (Buffer) mode', () => {
    const data = 'Hello World!';
    let source: ReadableMock;
    let sink: WritableMock;

    const drained = async () => e2p(sink, 'finish');

    beforeEach(() => {
      source = new ReadableMock(data);
      sink = new WritableMock();
    });

    it('should drop data while condition is met', async () => {
      const isNotW = v => v.toString() !== 'W';
      const blocker = new DropWhile(isNotW);
      source.pipe(blocker).pipe(sink);
      await drained();
      const expected = 'World!';
      const actual = Array.isArray(sink.data)
        ? sink.data.join('')
        : sink.data.toString(); // TODO fix stream-mock #8
      expect(actual).to.equals(expected);
    });
  });
});
