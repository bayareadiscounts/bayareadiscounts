module.exports = async function (context, req) {
  context.res = {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
    body: { error: 'Not implemented' }
  };
};
