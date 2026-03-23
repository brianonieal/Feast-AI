// @version 0.4.0 - Spark: Inngest client
import { Inngest } from "inngest";
import { APP_NAME } from "@feast-ai/shared";

export const inngest = new Inngest({ id: APP_NAME.toLowerCase().replace("-", "") });
