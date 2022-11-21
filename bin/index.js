#! /usr/bin/env node --no-warnings
import { Command } from "commander";
import json from "../package.json" assert { type: "json" };
import commands from "../commands/index.js";
const program = new Command();
const version = json.version;

program.version(version).name("pm").description("Package manager for AWS services with frameworks used by ASCENDING");

program.command("add").description("Add a new GitHub template repo.").alias("a").option("-t, --template").option("-f, --file").action(function () {
    commands.add(this.opts());
});

program.command("init").description("Create a new Repo and Project").alias("i").option("-d, --depth [depth]", "depth of the folder structure").action(function() {
    commands.init(this.opts());
});

program.command("config").description("Configure the project manager for you.").alias("c").option("-r, --repo").option("-a, --add").option("-p, --profile").option("-r, --reset").action(function () {
    commands.config(this.opts())
});

program.parse(process.argv);

if (!program.args.length) {
    program.help()
}