module.exports = (ctx) => {
  const current = ctx
    .db
    .get(`current.${ctx.resourceName}`)
    .value();
  if (!current) {
    ctx.throw(404);
  }
  const list = ctx
    .db
    .get('records')
    .filter({
      name: ctx.resourceName,
    })
    .value();

  if (list.length === 0) {
    ctx.throw(404);
  }
  const index = list.findIndex((item) => item._id === current);
  if (index === -1 || index === 0) {
    ctx.throw(404);
  }
  const prevItem = list[index - 1];
  ctx
    .db
    .set(`current.${ctx.resourceName}`, prevItem._id)
    .write();
  return prevItem._id;
};
