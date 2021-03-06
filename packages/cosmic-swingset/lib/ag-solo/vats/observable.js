export default function makeObservablePurse(E, purse, onFulfilled) {
  return {
    getCurrentAmount() {
      return E(purse).getCurrentAmount();
    },
    getAllegedBrand() {
      return E(purse).getAllegedBrand();
    },
    deposit(...args) {
      return E(purse)
        .deposit(...args)
        .then(result => {
          onFulfilled();
          return result;
        });
    },
    withdraw(...args) {
      return E(purse)
        .withdraw(...args)
        .then(result => {
          onFulfilled();
          return result;
        });
    },
  };
}
