// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';
import { E } from '@agoric/eventual-send';

import produceIssuer from '../../src/issuer';

test('issuer.getBrand, brand.isMyIssuer', t => {
  try {
    const { issuer, brand } = produceIssuer('fungible');
    const myBrand = issuer.getBrand();
    t.ok(myBrand.isMyIssuer(issuer));
    t.equals(
      brand,
      myBrand,
      'brand returned from `produceIssuer` and from `getBrand` the same',
    );
    t.equals(issuer.getAllegedName(), myBrand.getAllegedName());
    t.equals(issuer.getAllegedName(), 'fungible');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.getAmountMath', t => {
  try {
    const { issuer, amountMath, brand } = produceIssuer('fungible');
    t.equals(issuer.getAmountMath(), amountMath);
    const fungible = amountMath.make;
    t.ok(
      amountMath.isEqual(
        amountMath.add(fungible(100), fungible(50)),
        fungible(150),
      ),
    );
    t.equals(fungible(4000).extent, 4000);
    t.equals(fungible(0).brand, brand);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.getMathHelpersName', t => {
  try {
    const { issuer } = produceIssuer('fungible');
    t.equals(issuer.getMathHelpersName(), 'nat');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.makeEmptyPurse', t => {
  t.plan(6);
  const { issuer, mint, amountMath, brand } = produceIssuer('fungible');
  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(amountMath.make(837));

  t.ok(
    amountMath.isEqual(purse.getCurrentAmount(), amountMath.getEmpty()),
    `empty purse is empty`,
  );
  t.equals(purse.getAllegedBrand(), brand, `purse's brand is correct`);
  const fungible837 = amountMath.make(837);

  const checkDeposit = newPurseBalance => {
    t.ok(
      amountMath.isEqual(newPurseBalance, fungible837),
      `the balance returned is the purse balance`,
    );
    t.ok(
      amountMath.isEqual(purse.getCurrentAmount(), fungible837),
      `the new purse balance is the payment's old balance`,
    );
  };

  const performWithdrawal = () => purse.withdraw(fungible837);

  const checkWithdrawal = newPayment => {
    issuer.getAmountOf(newPayment).then(amount => {
      t.ok(
        amountMath.isEqual(amount, fungible837),
        `the withdrawn payment has the right balance`,
      );
    });
    t.ok(
      amountMath.isEqual(purse.getCurrentAmount(), amountMath.getEmpty()),
      `the purse is empty again`,
    );
  };

  E(purse)
    .deposit(payment, fungible837)
    .then(checkDeposit)
    .then(performWithdrawal)
    .then(checkWithdrawal)
    .catch(e => t.assert(false, e));
});

test('issuer.deposit', t => {
  t.plan(2);
  const { issuer, mint, amountMath } = produceIssuer('fungible');
  const fungible25 = amountMath.make(25);

  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(fungible25);

  const checkDeposit = newPurseBalance => {
    t.ok(
      amountMath.isEqual(newPurseBalance, fungible25),
      `the balance returned is the purse balance`,
    );
    t.ok(
      amountMath.isEqual(purse.getCurrentAmount(), fungible25),
      `the new purse balance is the payment's old balance`,
    );
  };

  E(purse)
    .deposit(payment, fungible25)
    .then(checkDeposit);
});

test('issuer.deposit promise', t => {
  t.plan(1);
  const { issuer, mint, amountMath } = produceIssuer('fungible');
  const fungible25 = amountMath.make(25);

  const purse = issuer.makeEmptyPurse();
  const payment = mint.mintPayment(fungible25);
  const exclusivePaymentP = E(issuer).claim(payment);

  t.rejects(
    () => E(purse).deposit(exclusivePaymentP, fungible25),
    /deposit does not accept promises/,
    'failed to reject a promise for a payment',
  );
});

test('issuer.burn', t => {
  t.plan(2);
  const { issuer, mint, amountMath } = produceIssuer('fungible');
  const payment1 = mint.mintPayment(amountMath.make(837));

  E(issuer)
    .burn(payment1, amountMath.make(837))
    .then(burntBalance => {
      t.ok(
        amountMath.isEqual(burntBalance, amountMath.make(837)),
        `entire minted payment was burnt`,
      );
      t.rejects(() => issuer.getAmountOf(payment1), /payment not found/);
    })
    .catch(e => t.assert(false, e));
});

test('issuer.claim', t => {
  t.plan(3);
  const { issuer, amountMath, mint } = produceIssuer('fungible');
  const payment1 = mint.mintPayment(amountMath.make(2));
  E(issuer)
    .claim(payment1, amountMath.make(2))
    .then(newPayment1 => {
      issuer.getAmountOf(newPayment1).then(amount => {
        t.ok(
          amountMath.isEqual(amount, amountMath.make(2)),
          `new payment has equal balance to old payment`,
        );
        t.notEqual(
          newPayment1,
          payment1,
          `old payment is different than new payment`,
        );
      });

      t.rejects(() => issuer.getAmountOf(payment1), /payment not found/);
    });
});

test('issuer.splitMany bad amount', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('fungible');
    const payment = mint.mintPayment(amountMath.make(1000));
    const badAmounts = Array(2).fill(amountMath.make(10));
    t.rejects(
      _ => E(issuer).splitMany(payment, badAmounts),
      /rights were not conserved/,
      'successfully throw if rights are not conserved in proposed new payments',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.splitMany good amount', t => {
  t.plan(11);
  const { mint, issuer, amountMath } = produceIssuer('fungible');
  const oldPayment = mint.mintPayment(amountMath.make(100));
  const goodAmounts = Array(10).fill(amountMath.make(10));

  const checkPayments = splitPayments => {
    for (const payment of splitPayments) {
      issuer.getAmountOf(payment).then(amount => {
        t.deepEqual(
          amount,
          amountMath.make(10),
          `split payment has right balance`,
        );
      });
    }
    t.rejects(
      () => issuer.getAmountOf(oldPayment),
      /payment not found/,
      `oldPayment no longer exists`,
    );
  };

  E(issuer)
    .splitMany(oldPayment, goodAmounts)
    .then(checkPayments);
});

test('issuer.split bad amount', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('fungible');
    const { amountMath: otherUnitOps } = produceIssuer('other fungible');
    const payment = mint.mintPayment(amountMath.make(1000));
    t.rejects(
      _ => E(issuer).split(payment, otherUnitOps.make(10)),
      /the brand in the allegedAmount in 'coerce' didn't match the amountMath brand/,
      'throws for bad amount',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('issuer.split good amount', t => {
  t.plan(3);
  const { mint, issuer, amountMath } = produceIssuer('fungible');
  const oldPayment = mint.mintPayment(amountMath.make(20));

  const checkPayments = splitPayments => {
    for (const payment of splitPayments) {
      issuer.getAmountOf(payment).then(amount => {
        t.deepEqual(
          amount,
          amountMath.make(10),
          `split payment has right balance`,
        );
      });
    }
    t.rejects(
      () => E(issuer).getAmountOf(oldPayment),
      /payment not found/,
      `oldPayment no longer exists`,
    );
  };

  E(issuer)
    .split(oldPayment, amountMath.make(10))
    .then(checkPayments);
});

test('issuer.combine good payments', t => {
  t.plan(101);
  const { mint, issuer, amountMath } = produceIssuer('fungible');
  const payments = [];
  for (let i = 0; i < 100; i += 1) {
    payments.push(mint.mintPayment(amountMath.make(1)));
  }

  const checkCombinedPayment = combinedPayment => {
    issuer.getAmountOf(combinedPayment).then(amount => {
      t.deepEqual(
        amount,
        amountMath.make(100),
        `combined payment equal to the original payments total`,
      );
      for (const payment of payments) {
        t.rejects(
          () => issuer.getAmountOf(payment),
          /payment not found/,
          `original payments no longer exist`,
        );
      }
    });
  };
  E(issuer)
    .combine(payments)
    .then(checkCombinedPayment)
    .catch(e => t.assert(false, e));
});

test('issuer.combine array of promises', t => {
  t.plan(1);
  const { mint, issuer, amountMath } = produceIssuer('fungible');
  const paymentsP = [];
  for (let i = 0; i < 100; i += 1) {
    const freshPayment = mint.mintPayment(amountMath.make(1));
    const paymentP = issuer.claim(freshPayment);
    paymentsP.push(paymentP);
  }

  const checkCombinedResult = paymentP => {
    issuer.getAmountOf(paymentP).then(pAmount => {
      t.equals(pAmount.extent, 100);
    });
  };

  E(issuer)
    .combine(paymentsP)
    .then(checkCombinedResult)
    .catch(e => t.assert(false, e));
});

test('issuer.combine bad payments', t => {
  try {
    const { mint, issuer, amountMath } = produceIssuer('fungible');
    const { mint: otherMint, amountMath: otherAmountMath } = produceIssuer(
      'other fungible',
    );
    const payments = [];
    for (let i = 0; i < 100; i += 1) {
      payments.push(mint.mintPayment(amountMath.make(1)));
    }
    const otherPayment = otherMint.mintPayment(otherAmountMath.make(10));
    payments.push(otherPayment);

    t.rejects(
      () => E(issuer).combine(payments),
      /payment not found/,
      'payment from other mint is not found',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
