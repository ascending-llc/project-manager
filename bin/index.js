#! /usr/bin/env node --no-warnings
import { Command } from "commander";
import json from "../package.json" assert { type: "json" };
import commands from "../commands/index.js";
const program = new Command();
const version = json.version;

program.version(version).name("pm").description("Package manager for AWS services with frameworks used by ASCENDING");

program.command("add").description("Add a new GitHub template repo.").alias("a").action(commands.add);

program.command("init").description("Create a new Repo and Project").alias("i").action(commands.run);

program.command("config").description("Set up GitHub token in config").alias("c").action(commands.config);

program.parse(process.argv);

if (!program.args.length) {
    program.help()
}