const { loadGlpk } = require('../dist/src/optimizer/glpkClient');

(async () => {
  const glpk = await loadGlpk();
  const lp = {
    name: 'simple',
    objective: { direction: 1, name: 'obj', vars: [{ name: 'x', coef: 1 }] },
    subjectTo: [
      { name: 'c1', vars: [{ name: 'x', coef: 1 }], bnds: { type: 5, lb: 5, ub: 5 } },
    ],
    bounds: [{ name: 'x', type: 2, lb: 0, ub: 100 }],
    options: { msglev: 3 },
  };
  const r = glpk.solve(lp);
  console.log('RESULT', JSON.stringify(r, null, 2));
})();
