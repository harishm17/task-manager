import { computeNetBalances, computePairwiseBalances } from '../lib/api/balances';

describe('computeNetBalances', () => {
  it('accounts for expenses and settlements', () => {
    const people = [
      { id: 'p1', display_name: 'Sam', user_id: 'u1' },
      { id: 'p2', display_name: 'Alex', user_id: null },
    ];
    const expenses = [{ id: 'e1', paid_by_person_id: 'p1' }];
    const splits = [
      { expense_id: 'e1', person_id: 'p1', amount_owed_cents: 500 },
      { expense_id: 'e1', person_id: 'p2', amount_owed_cents: 500 },
    ];
    const settlements = [{ from_person_id: 'p2', to_person_id: 'p1', amount_cents: 200 }];

    const balances = computeNetBalances(people, expenses, splits, settlements);

    const sam = balances.find((row) => row.personId === 'p1');
    const alex = balances.find((row) => row.personId === 'p2');

    expect(sam?.netCents).toBe(300);
    expect(alex?.netCents).toBe(-300);
  });
});

describe('computePairwiseBalances', () => {
  it('tracks balances relative to the current person', () => {
    const people = [
      { id: 'p1', display_name: 'Sam', user_id: 'u1' },
      { id: 'p2', display_name: 'Alex', user_id: null },
      { id: 'p3', display_name: 'Jess', user_id: null },
    ];
    const expenses = [
      { id: 'e1', paid_by_person_id: 'p1' },
      { id: 'e2', paid_by_person_id: 'p2' },
    ];
    const splits = [
      { expense_id: 'e1', person_id: 'p1', amount_owed_cents: 500 },
      { expense_id: 'e1', person_id: 'p2', amount_owed_cents: 500 },
      { expense_id: 'e2', person_id: 'p1', amount_owed_cents: 400 },
      { expense_id: 'e2', person_id: 'p2', amount_owed_cents: 400 },
    ];
    const settlements = [{ from_person_id: 'p1', to_person_id: 'p2', amount_cents: 150 }];

    const balances = computePairwiseBalances({
      currentPersonId: 'p1',
      people,
      expenses,
      splits,
      settlements,
    });

    const alex = balances.find((row) => row.personId === 'p2');
    const jess = balances.find((row) => row.personId === 'p3');

    expect(alex?.netCents).toBe(250);
    expect(jess).toBeUndefined();
  });
});
