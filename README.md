# Mutode2
Please read the original Mutode Readme first [here](https://github.com/TheSoftwareDesignLab/mutode/blob/master/README.md)

**Requires Node 8+**

## Install
The mutode2 package is not published to npm, and thus requires a manual install
1. Download/Clone this repo
2. Navitage to the repo and run 
```
npm install
```
3. Naviagate one step up (i.e to the directory containing the mutode2 repo)
4. Run the following command to install mutode2 from source globally
```
npm install -g <mutode2 directory name>
```

## Use

Globally:

```sh
mutode [options] [paths]
```

Locally with `npx`:

```sh
npx mutode [options] [paths]
```

Locally with a package.json script:

```
{
  ...
  "scripts": {
    "test: "my test command",
    "mutode": "mutode [options] [paths]"
  }
  ...
}
```

**Options**:

```
Usage: mutode [options] [paths]

Options:
  --concurrency, -c  Concurrency of mutant runners         [number] [default: 4]
  --mutators, -m     Specific mutators to load (space separated)
      [array] [choices: "booleanLiterals", "conditionalsBoundary", "increments",
             "invertNegatives", "math", "negateConditionals", "numericLiterals",
              "removeArrayElements", "removeConditionals", "removeFuncCallArgs",
         "removeFuncParams", "removeFunctions", "removeLines", "removeObjProps",
                                          "removeSwitchCases", "stringLiterals"]
  -h, --help         Show help                                         [boolean]
  -v, --version      Show version number                               [boolean]
```

## License
MIT Copyright © Diego Rodríguez Baquero
