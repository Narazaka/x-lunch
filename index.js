const path = require("path");
const Koa = require("koa");
const IO = require('koa-socket-2');
const Router = require("koa-router");
const koaBody = require("koa-body");
const static = require("koa-static");
const helmet = require("koa-helmet");
const views = require("koa-views");
const handleError = require("koa-handle-error");
const Lunch = require("./lunch");

const app = new Koa();

app.use(handleError(error => console.error(error)))
app.use(helmet());
app.use(koaBody());
app.use(static(path.join(__dirname, "static")));
app.use(views(path.join(__dirname, "views"), { extension: "pug" }));

// Socket.IO

const findLunchId = (rooms) => Object.keys(rooms).find(room => typeof rooms[room] === "number");

// lunchIdAndNames

const lunchIdAndNames = new IO("lunchIdAndNames");
lunchIdAndNames.attach(app);

lunchIdAndNames.socket.on("connection", async (socket) => {
  socket.emit("result", await Lunch.idAndNames());
});

lunchIdAndNames.emitResult = async function() { this.broadcast("result", await Lunch.idAndNames()); };

// lunchName

const lunchName = new IO("lunchName");
lunchName.attach(app);

lunchName.socket.on("connection", (socket) => {
  socket.on("init", async (lunchId) => {
    socket.join(Number(lunchId));
    const lunch = Lunch.get(lunchId);
    socket.emit("result", await lunch.name());
  });
});

lunchName.emitResult = async function(lunchId) { this.to(lunchId).emit("result", await Lunch.get(lunchId).name()); }

lunchName.on("update", async (ctx, name) => {
  const lunchId = findLunchId(ctx.socket.rooms);
  const lunch = Lunch.get(lunchId);
  await lunch.setName(name);
  await lunchName.emitResult(lunchId);
  await lunchIdAndNames.emitResult();
});

// lunchMembers

const lunchMembers = new IO("lunchMembers");
lunchMembers.attach(app);

lunchMembers.socket.on("connection", (socket) => {
  socket.on("init", async (lunchId) => {
    socket.join(Number(lunchId));
    const lunch = Lunch.get(lunchId);
    socket.emit("result", await lunch.members());
  });
});

lunchMembers.emitResult = async function(lunchId) { this.to(lunchId).emit("result", await Lunch.get(lunchId).members()); }

lunchMembers.on("add", async (ctx, names) => {
  const lunchId = findLunchId(ctx.socket.rooms);
  const lunch = Lunch.get(lunchId);
  await lunch.addMembers(names);
  await lunchMembers.emitResult(lunchId);
});

lunchMembers.on("remove", async (ctx, name) => {
  const lunchId = findLunchId(ctx.socket.rooms);
  const lunch = Lunch.get(lunchId);
  await lunch.removeMembers([name]);
  await lunchMembers.emitResult(lunchId);
});

// lunchInactiveMembers

const lunchInactiveMembers = new IO("lunchInactiveMembers");
lunchInactiveMembers.attach(app);

lunchInactiveMembers.socket.on("connection", (socket) => {
  socket.on("init", async ({ id, date }) => {
    socket.join(Number(id));
    const lunch = Lunch.get(id);
    socket.emit("result", date, await lunch.date(date).inactiveMembers());
  });
});

lunchInactiveMembers.emitResult = async function(lunchId, date) { this.to(lunchId).emit("result", date, await Lunch.get(lunchId).date(date).inactiveMembers()); }

lunchInactiveMembers.on("active", async (ctx, { name, date }) => {
  const lunchId = findLunchId(ctx.socket.rooms);
  const lunch = Lunch.get(lunchId);
  await lunch.date(date).setActive(name);
  await lunchInactiveMembers.emitResult(lunchId, date);
});

lunchInactiveMembers.on("inactive", async (ctx, { name, date }) => {
  const lunchId = findLunchId(ctx.socket.rooms);
  const lunch = Lunch.get(lunchId);
  await lunch.date(date).setInactive(name);
  await lunchInactiveMembers.emitResult(lunchId, date);
});

// lunchMembersOfGroups

const lunchMembersOfGroups = new IO("lunchMembersOfGroups");
lunchMembersOfGroups.attach(app);

lunchMembersOfGroups.socket.on("connection", (socket) => {
  socket.on("init", async (lunchId) => {
    socket.join(Number(lunchId));
    const lunch = Lunch.get(lunchId);
    const data = await lunch.date(await lunch.currentDate()).membersOfGroupsAndOtherInfo();
    console.log(data);
    socket.emit("result", data);
  });
});

lunchMembersOfGroups.emitResult = async function(lunchId, shuffled) {
  const lunch = Lunch.get(lunchId);
  const data = await lunch.date(await lunch.currentDate()).membersOfGroupsAndOtherInfo();
  data.shuffled = shuffled;
  console.log(data);
  this.to(lunchId).emit("result", data);
}

lunchMembersOfGroups.on("shuffle", async (ctx, { date, groupCount, inactiveMembers }) => {
  const lunchId = findLunchId(ctx.socket.rooms);
  const lunch = Lunch.get(lunchId);
  await lunch.date(date).shuffleGroups(groupCount, inactiveMembers);
  await lunchMembersOfGroups.emitResult(lunchId, true);
});

lunchMembersOfGroups.on("add", async (ctx, { date, groupId, name }) => {
  const lunchId = findLunchId(ctx.socket.rooms);
  const lunch = Lunch.get(lunchId);
  await lunch.date(date).addGroupMember(groupId, name);
  await lunchMembersOfGroups.emitResult(lunchId);
});

lunchMembersOfGroups.on("move", async (ctx, { date, fromGroupId, toGroupId, name }) => {
  const lunchId = findLunchId(ctx.socket.rooms);
  const lunch = Lunch.get(lunchId);
  await lunch.date(date).moveGroupMember(fromGroupId, toGroupId, name);
  await lunchMembersOfGroups.emitResult(lunchId);
});

// HTTP

const router = new Router();

router.get("/", async (ctx, next) => {
  await ctx.render("index");
});

router.post("/", async (ctx, next) => {
  const lunch = await Lunch.add(ctx.request.body.name);
  ctx.redirect(`/${lunch.id}`);
  lunchIdAndNames.emitResult();
});

router.get("/:id", async (ctx, next) => {
  const id = Number(ctx.params.id);
  await ctx.render("show", { id });
});

app.use(router.routes());
app.use(router.allowedMethods());

// listen

app.listen(5000);
