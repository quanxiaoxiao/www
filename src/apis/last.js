module.exports = (ctx) => {
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
  const last = list[list.length - 1];
  ctx
    .db
    .set(`current.${ctx.resourceName}`, last._id)
    .write();
  return last._id;
};
