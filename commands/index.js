const shell = require("shelljs");

const add = async (args) => {
    shell.exec("echo added");
}

const run = async (args) => {
    shell.exec("echo ran");
}

module.exports = {
    add,
    run
}