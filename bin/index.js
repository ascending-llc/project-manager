#! /usr/bin/env node
const { Command } = require("commander");
const commands = require("../commands");
const { version } = require("../package.json");
const program = new Command();

program.version(version).name("pm").description("Package manager for AWS services with frameworks used by ASCENDING");

program.command("add").description("Add a new GitHub template repo.").alias("a").action(commands.add);

program.command("init").description("Create a new Repo and Project").alias("i").action(commands.run);

program.parse(process.argv);

if(!program.args.length) {
    program.help()
}