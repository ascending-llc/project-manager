import fs from "fs";
import inquirer from "inquirer";
import shell from "shelljs"

const add = () => {
    data = {
        type: "",
        link: "",
        name: ""
    }
    inquirer.prompt([
        {
            type: "list",
            message: "What is the type of the template",
            name: "type",
            choices: [
                "Cloudformation template",
                "Code"
            ],
        },
        {
            type: "input",
            message: "What is the name of the template",
            name: "name",
        },
        {
            type: "input",
            message: "What is the link for this template",
            name: "link"
        }
    ])
}

const config = () => {
    inquirer.prompt([
        {
            type: "password",
            message: "Please enter your GitHub token",
            name: "password",
            mask: "*"
        }
    ]).then(e => {
        fs.writeFile("../config/userconfig.json", JSON.stringify(e), () => {
            shell.echo("Successfully imported User Config")
            fw
        });
    })
}

const init = () => {

}

export default {
    add,
    config,
    init
}