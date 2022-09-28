# AWS Project Manager

Project manager enabling users to keep data clean and organized, ensuring only one directory for code is needed.

## **Directory**

- [Installation](#installation)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
  - [On start commands](#configuring-on-start-commands)
  - [Adding Profiles](#adding-a-new-profile)
  - [Switching Profiles](#switching-between-profiles)
  - [Resetting Config](#resetting-the-config-files)
- [Adding custom templates](#adding-templates)
  - [Questions](#questions)
  - [File Templates](#file-templates)

## Usage

### **Installation**

```bash
npm i awspm -g
```

### or in newer npm versions

```bash
npm i awspm --location=global
```

# **Getting Started**

## **Using the CLI**

Run below command to either start a new project or change to an existing one.

```bash
pm i
```

\* Running above command will delete all files in current directory

### Get a GitHub token

Go to [this website](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and follow the steps to create a token. Make sure:

- Your token has Full access to repos
- Your token has Admin access to repo hooks
- You have copied the token

## **Configuration**

Run below command and follow the steps:

```bash
pm config
```

\* Please understand if you choose to be in an org any new project will be under that org.

> ## Configuring on start commands

Whenever you find that there are still some repetitive commands you have to run whenever opening a specific project (Ex: `npm i` or `npm run start:test`), consider adding on start commands.

### To add on start commands run

```bash
pm c -r
```

### or

```bash
pm config --repo
```

\* Each command must be seperated by a semicolon `;`

> ## Adding a new profile

Sometimes we may need multiple profiles and an easy way to switch across them. (Ex: Multiple GitHub accs, working with multiple orgs, or working with one org)

### Run any of these commands and follow the steps to add a new profile

```bash
pm c -a
```

### or

```bash
pm config --add
```

> ## Switching between profiles

Once you have multiple profiles we need a quick an easy way to switch between all of them.

### Run either

```bash
pm c -p
```

### or

```bash
pm config --profiles
```

> ## Resetting the config files

If any troubleshooting doesn't seem to work you may need to update your config files.

If you made any local templates or have any sensitive data back up your files... the config is found ~/.awspm

```bash
pm config -r
```

\* When resetting config files, you will also lose any local templates and profiles... please only do this as a last step

> ## Adding Templates

This is where the AWSPM really starts to show off. There are 3 default templates for everyone. Of the three there are currently three different types of templates... Git Clone, Git Template, and Git Boilerplate.

### **Current project**

### Run either

```bash
pm add
```

### or

```bash
pm a
```

### **Boilerplate**

Boilerplate templates are templates that have the capability to replace variables within the code, allowing these templates to compliment your own existing code and increasing reusability.

> ### Getting Started

### Creating a JSON file:

A boilerplate JSON file must have...

- at least one [question](#questions).
- a special variables key. A Variables key will be the substring that `awspm` looks for when substituting code out.

When done it should look something like this

```json
{
  "variables": "({})",
  "questions": [
    {
      "type": "input",
      "title": "What is your name?",
      "line": 9,
      "file": "root.yaml",
      "name": "s3_templates"
    }
  ]
}
```

All that's left is importing that file into your config files by using the below command and selecting `Git Boilerplate`

```bash
pm add --template
```

### or

```bash
pm a -t
```

### **Variables Key**

The variables key is extremely important so take your time deciding on one... whenever you've decided on one make sure to replace every spot where you would like to import user boilerplate code as the key.

## **Questions**

A question is the basis of Boilerplate templates, as it tells `awspm` where and what to put code.

### There are five different things that go into every single question.

- [Type](#type-string)
- [Title](#title-string)
- [Line](#line-int--string)
- [File](#file-string)
- [Name](#name-string)

### **When done it should look something like [this](#a-finished-question-object)**

### Type `string`

The different types of questions you can use are:

- git:
  - **Fetches data from git**
  - repos (Ex: git:repos)
    - Returns a list of Repos
- file>
  - **Returns all saved user file templates**
  - yaml (Ex: file>yaml)
    - Converts JSON to YAML
- Basic
  - Input
    - Asks for user input
  - Password
    - Masks user input

### Title `string`

The title is the question you want to ask, when a user is asked this question.

### Line `int || string`

Somethings to note about a line:

- A line denotes where awspm should look for the special variables key.
- A line should be an integer when dealing with only one line of code.
- A line should be a string seperated by commas when multiple. (Ex: `'3,7'` )

### File `string`

The file key tells awspm which file to look for and where to replace the code, this key is denoted by the root directory inside the Repo (Ex: `'src/app.js'` )

\* This currently only supports one file at a time... has plans to convert to `string || array` type

### Name `string`

This is a **unique** backend key that tells awspm which key it is reffering to

### A finished question `object`

When all is said and done each question should look a little like this.

```json
{
    "type": "input",
    "title": "What is the name of this app?",
    "line": "9,15",
    "file": "app.js",
    "name": "app_name"
}
```

## **File Templates**

These show up in Boilerplate Projects making it possible to import your own Boilerplate into a Boilerplate project all the time.

Current Supported File Templates:
- JSON
    - **Boilerplate Stored as JSON**
    - Yaml
        - Converts JSON to YAML

\* Currently the project only allows for JSON to yaml.

### To do this use 

```bash
pm add --file
```

### or 

```bash
pm a -f
```

### Yaml

This one's pretty simple, just create a JSON file that when switched to YAML format will look good.

### **Code**

Code templates are your default templates only to get a project up and running instead of to compliment an already existing one.

\* We're in need of more templates so if you want your own added just send in a pr!
