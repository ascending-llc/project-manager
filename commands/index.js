import fs from "fs";
import inquirer from "inquirer";
import { homedir } from "os";
import shell from "shelljs"
import templates from "../config/templates.json" assert { type: "json" };
import axios from "axios";

const add = () => {
    let data = {
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
            message: "What is the link for this template (if code, please input the template generation link)",
            name: "link",
            when: (e) => e.type === "Cloudformation template"
        },
        {
            type: "input",
            message: "Who is the owner of the template repo?",
            name: "owner",
            when: (e) => e.type === "Code"
        },
        {
            type: "input",
            message: "What is the repo name?",
            name: "repo",
            when: (e) => e.type === "Code"
        }
    ]).then(element => {
        fs.readFile(homedir() + "/.awspm/templates.json", (e, d) => {
            if (e) {
                console.log(e)
            } else {
                let data = JSON.parse(d);
                let link = e.type === "Code" ? `https://api.github.com/repos/${e.owner}/${e.repo}/generate` : e.link
                let new_data = {
                    type: e.type,
                    name: e.name,
                    link
                }
                data["templates"].push(new_data);
                fs.writeFileSync(homedir() + "/.awspm/templates.json", JSON.stringify(data));
                shell.echo("Successfully pushed " + element.name + " to templates");
            }
        })
    }).catch(e => console.log(e))
}

const config = () => {
    shell.echo("The GitHub token must have Repo access as well as Hook access");
    inquirer.prompt([
        {
            type: "password",
            message: "Please enter your token",
            name: "password",
            mask: "*"
        },
        {
            type: "list",
            message: "Are you working under an organization?",
            name: "is_org",
            choices: [
                "Yes",
                "No"
            ]
        },
        {
            type: "input",
            message: "What is name of the GitHub Org",
            name: "org",
            when: (e) => e.is_org === "Yes"
        }
    ]).then(e => {
        if (!fs.existsSync(homedir() + "/.awspm")) {
            fs.mkdirSync(homedir() + "/.awspm");
            fs.writeFileSync(homedir() + "/.awspm/userconfig.json", JSON.stringify(e))
            fs.writeFileSync(homedir() + "/.awspm/templates.json", JSON.stringify(templates))
            shell.echo("Successfully imported Config Files")
        } else {
            fs.writeFileSync(homedir() + "/.awspm/userconfig.json", JSON.stringify(e))
            shell.echo("Successfully updated User Config")
        }
    })
}

const init = async () => {
    if (!fs.existsSync(homedir() + "/.awspm")) {
        shell.echo("Please run pm config to set up configuration files");
        shell.exit();
    }
    let data = fs.readFileSync(homedir() + "/.awspm/templates.json");
    let templates = JSON.parse(data);
    let cloud_templates = templates["templates"].filter(e => e.type === "cloud");
    let code_templates = templates["templates"].filter(e => e.type === "code");
    let userdata = fs.readFileSync(homedir() + "/.awspm/userconfig.json");
    let userconfig = JSON.parse(userdata);

    let repo_link = `https://api.github.com/${userconfig.is_org === "Yes" ? `org/${userconfig.org}` : "user"}/repos`
    let res = await axios.get(repo_link, {
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: "token " + userconfig.password
        },
        params: {
            sort: "pushed"
        }
    })

    let names = res.data.map(e => e.name);
    // shell.exec("find . -delete")
    inquirer.prompt([
        {
            type: "list",
            choices: [
                "New",
                "Existing"
            ],
            name: "choice1",
            message: "Is this project a new or existing project"
        },
        {
            type: "checkbox",
            choices: [
                "None",
                ...cloud_templates.map(e => e.name)
            ],
            message: "Would you like any Cloud templates?",
            name: "cloud_templates",
            when: (e) => e.choice1 === "New"
        },
        {
            type: "list",
            choices: [
                "Empty",
                ...code_templates.map(e => e.name)
            ],
            message: "What code template would you like?",
            name: "code_template",
            when: (e) => e.choice1 === "New"
        },
        {
            type: "list",
            choices: [...names],
            message: "Please choose which repo you're working on...",
            name: "repo",
            when: (e) => e.choice1 === "Existing"
        },
        {
            type: "input",
            message: "What is the name of the new Project?",
            name: "name",
            when: (e) => e.choice1 === "New"
        },
        {
            type: "list",
            message: "Is the project private or public?",
            choices: [
                "Private",
                "Public"
            ],
            name: "is_private",
            when: (e) => e.choice1 === "New"
        },
        {
            type: "input",
            message: "Basic description of the new app",
            name: "desc",
            when: (e) => e.choice1 === "New"
        }
    ]).then(async e => {
        if (e.choice1 === "New") {
            let post;
            let data = {
                "name": e.name,
                "description": e.desc,
                "private": e.is_private === "Private"
            };
            if (e.code_template === "Empty") {
                post = userconfig.is_org === "Yes" ? "https://api.github.com/orgs/" + userconfig.org + "/repos" : "https://api.github.com/user/repos";
            } else {
                if (userconfig.is_org === "Yes") data["owner"] = userconfig.org;
                post = e.code_template.link
            }
            let res = await axios.post(post, data, {
                headers: {
                    Accept: "application/vnd.github+json",
                    Authorization: "token " + userconfig.password
                }
            })
            let repo_url = res.data.clone_url;

            shell.echo("Creating and cloning repo...")

            shell.exec("sleep 3")

            shell.exec(`git clone ${repo_url} -s`)

            if (e.cloud_templates[0] !== "None") {
                for (const template in e.cloud_templates) {
                    let cur_template = cloud_templates.filter(e => e.name === template);
                    
                    shell.echo(`Cloning ${template}`);

                    shell.exec(`git clone ${cur_template.link} -s`)
                }
            }
        } else {
            let clone_url = res.data.filter(repo => repo.name === e.repo)[0].clone_url;
            shell.exec(`git clone ${clone_url}`);
        }
    })
}

export default {
    add,
    config,
    init
}