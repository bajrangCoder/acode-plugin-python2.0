# Python 2.0 (Enhanced)

This enhanced Acode Python plugin provides an improved experience for running Python code within the Acode editor. It builds upon the original plugin, introducing new features and improvements.

> [GitHub Repo](https://github.com/bajrangCoder/acode-plugin-python2.0)

## Features and Improvements

1. **Module Support:**
   - Ability to use Python modules within your code.
   - Module installation support, allowing you to install additional Python packages as needed.

2. **Enhanced Module Loading:**
   - Improved module loading, with the option to specify the wheel path for modules.
   - Efficient handling of module dependencies.

3. **Native Filesystem Access (TODO):**
   - Work in progress to add support for native filesystem access, enhancing file interaction capabilities.

4. **Performance Optimization:**
   - Considerable efforts to optimize code execution, enhancing the overall performance of running Python code.(But still slow compare to termux one)

> Note: while using module in code you will require internet to run it

## Important Notes

- The plugin is under active development, and new features will be introduced in future updates.
- Currently, importing other Python files is not supported but will be addressed in upcoming releases.
- Ensure your device supports the plugin by checking the console for any errors related to the 'const' keyword declaration.

## Limitations

- Native filesystem access (like reading or writing from your storage)[comming soon]
- You can't use non-web gui because that's experimental in pyodide and creates many problems[no plan, but when pyodide make it stable then it will be added]
- Slow code execution [nothing can be done]

## How to install module?

There are some packages which are built-in so you will not need to install it([built-in modules](https://pyodide.org/en/stable/usage/packages-in-pyodide.html)).

For installing modules either you will need package name or its wheel url
then follow these steps:
- open command palette (<pwd>Ctrl+shift+P</pwd>) and search for "Python Modules"
- and add your module name or wheel url in json file like this 👇 and save it
```json
[
  "wheel url",
  "or module name like requests"
]
```

## Alternative Option to run Python on Acode 

The best option to run python is using terminal plugins like AcodeX

Follow the steps to run using AcodeX:
- Install and setup their server and install that plugin in Acode 
- Inside AcodeX terminal install **python** using : `pkg install python`
- And for running code use : `python yourfile.py`

## Acknowledgement

- [Pyodide](https://pyodide.org/en/stable/)
- [Python Plugin](https://github.com/deadlyjack/acode-plugin-python)

## Contributions

Contributions to this enhanced Acode Python plugin are welcome. Feel free to fork the repository, make improvements, and submit pull requests.

**Happy Coding with Python in Acode!**