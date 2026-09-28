import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("expire abandoned paystack orders", { minutes: 15 }, internal.orders.expireUnpaid, {});
crons.daily("clear expired admin sessions", { hourUTC: 3, minuteUTC: 0 }, internal.orders.clearSessions, {});
export default crons;
