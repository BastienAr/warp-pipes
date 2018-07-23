import { Transform, TransformCallback, TransformOptions } from 'stream';

/**
 *
 */
export class Flatten extends Transform {
  constructor(opts: TransformOptions = { objectMode: true }) {
    if (opts.objectMode !== true) {
      throw new Error('Flatten transform operate in objectMode only');
    }
    super(opts);
  }

  // tslint:disable-next-line:function-name
  public _transform(chunk: any, encoding: string, callback: TransformCallback) {
    if (Array.isArray(chunk)) {
      chunk.forEach(item => this.push(item));
    } else {
      this.push(chunk);
    }
    callback();
  }
}
