const PENDING = "Pending";
const FULFILLED = "Fulfilled";
const REJECTED = "Rejected";
const async = (fn, timeout = 1) => {
  if (typeof document === "object" && window.queueMicrotask) {
    window.queueMicrotask(fn);
  } else if (process && process.nextTick) {
    process.nextTick(fn);
  } else {
    setTimeout(fn, timeout);
  }
};

class Promise {
  status = PENDING;
  value;
  reason;
  fulfillCallback = [];
  rejectCallback = [];
  constructor(handler) {
    handler(this._resolve.bind(this), this._reject.bind(this));
  }

  _resolve(result) {
    if (result === this) {
      throw new TypeError("Should not resove itself.");
    }

    if (this.status === PENDING) {
      if (result instanceof Promise) {
        result.then(this._resolve.bind(this), this._reject.bind(this));
      } else if (
        result &&
        (typeof result === "object" || typeof result === "function")
      ) {
        // 2.3.3
        let called = false;
        try {
          const then = result.then; // for note 3.5
          if (then && typeof then === "function") {
            then.call(
              result,
              (value) => {
                if (!called) this._resolve(value);
                called = true;
              },
              (reason) => {
                if (!called) this._reject(reason);
                called = true;
              }
            );
          } else {
            this._fulfill(result);
          }
        } catch (error) {
          if (!called) this._reject(error);
        }
      } else {
        this._fulfill(result);
      }
    }
  }

  _reject(reason) {
    if (this.status !== PENDING) return;
    this.reason = reason;
    this.status = REJECTED;
    this.rejectCallback.forEach((callback) => callback(this.reason));
  }

  _fulfill(result) {
    if (this.status !== PENDING) return;
    this.value = result;
    this.status = FULFILLED;
    this.fulfillCallback.forEach((callback) => callback(this.value));
  }

  then(onFulfilled, onRejected) {
    if (this.status === PENDING) {
      return new Promise((resolve, reject) => {
        this.fulfillCallback.push((result) => {
          async(() => {
            try {
              const fulfilled =
                onFulfilled && typeof onFulfilled === "function"
                  ? onFulfilled(result)
                  : result;
              resolve(fulfilled);
            } catch (error) {
              reject(error);
            }
          });
        });
        this.rejectCallback.push((reason) => {
          async(() => {
            try {
              if (onRejected && typeof onRejected === "function") {
                resolve(onRejected(reason));
              } else {
                reject(reason);
              }
            } catch (error) {
              reject(error);
            }
          });
        });
      });
    }
    if (this.status === FULFILLED) {
      return new Promise((resolve, reject) => {
        async(() => {
          try {
            const fulfilled =
              onFulfilled && typeof onFulfilled === "function"
                ? onFulfilled(this.value)
                : this.value;
            resolve(fulfilled);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    if (this.status === REJECTED) {
      return new Promise((resolve, reject) => {
        async(() => {
          try {
            if (onRejected && typeof onRejected === "function") {
              resolve(onRejected(this.reason));
            } else {
              reject(this.reason);
            }
          } catch (error) {
            reject(error);
          }
        });
      });
    }
  }
}

Promise.deferred = function () {
  const pending = {};
  pending.promise = new Promise((resolver, reject) => {
    pending.resolve = resolver;
    pending.reject = reject;
  });
  return pending;
};

module.exports = Promise;
