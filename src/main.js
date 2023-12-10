import tag from 'html-tag-js';
import plugin from '../plugin.json';
import style from './style.scss';

const appSettings = acode.require("settings");
const fs = acode.require("fsOperation");
const EditorFile = acode.require('EditorFile');

class Python {
  #worker;
  #onInitError;
  #onInitSuccess;
  #onRunSuccess;
  #onRunError;
  #cacheFile;
  #cacheFileUrl;
  #isInput = false;
  $input = null;
  $page = null;
  $runBtn = null;
  $style = null;
  #codes = [];
  #niddle = 0;
  #inputCount = 0;
  #state = 0;

  INITIALIZING = 1;
  INITIALIZED = 2;
  NOT_INTIALIZED = 0;

  name = 'Python';
  baseUrl = '';
  pyodide = null;
  
  async init($page, cacheFile, cacheFileUrl) {
    $page.id = 'acode-plugin-python';

    this.#cacheFileUrl = cacheFileUrl;
    this.$page = $page;
    this.$page.settitle('Python');
    this.#cacheFile = cacheFile;
    
    editorManager.editor.commands.addCommand({
      name: "python:install_modules",
      description: "Python Modules",
      exec: () => {
        new EditorFile("python_modules.json",{
          uri: window.DATA_STORAGE+"python_modules.json"
        });
      }
    })
    
    const onhide = $page.onhide;
    $page.onhide = () => {
      this.#state = this.NOT_INTIALIZED;
      this.#worker?.terminate();
      this.initWorker();
      onhide();
    };
    
    let main = this.$page.get('.main');

    if (!main) {
      main = tag('div', { className: 'main' });
      this.$page.append(main);
    }

    main.style.padding = '10px';
    main.style.overflow = 'auto';
    main.style.boxSizing = 'border-box';

    this.$runBtn = tag('span', {
      className: 'icon play_arrow',
      attr: {
        action: 'run',
      },
      onclick: this.run.bind(this),
    });

    this.$style = tag('style', {
      textContent: style,
    });

    this.$input = tag('div', {
      className: 'print input',
      child: tag('textarea', {
        onkeydown: this.#onkeydown.bind(this),
        oninput: this.#oninput.bind(this),
      }),
    });
    
    if(!(await fs(window.DATA_STORAGE+"python_modules.json").exists())){
      await fs(window.DATA_STORAGE).createFile("python_modules.json", "[]")
    }

    this.checkRunnable();
    editorManager.on('switch-file', this.checkRunnable.bind(this));
    editorManager.on('rename-file', this.checkRunnable.bind(this));
    document.head.append(this.$style);
    this.initWorker();
  }
  
  async initWorker() {
    if (this.#state !== this.NOT_INTIALIZED) return;
    this.#state = this.INITIALIZING;
    this.$page.settitle(strings['loading...']);
    this.#worker = new Worker(this.baseUrl + 'worker.js');
    this.#worker.postMessage({
      action: 'init',
      packages: JSON.parse(await fs(window.DATA_STORAGE+"python_modules.json").readFile("utf8")),
      baseUrl: this.baseUrl,
      cacheFileUrl: this.#cacheFileUrl
    });
    this.#worker.onmessage = this.#workerOnMessage.bind(this);

    try {
      await new Promise((resolve, error) => {
        this.#onInitSuccess = resolve;
        this.#onInitError = error;
      });
    } catch (error) {
      this.print(error, 'error');
      return;
    }
  }
  
  async run() {
    this.#showPage();
    this.#inputCount = 0;
    this.#append(this.$input);
    await this.#cacheFile.writeFile('');
    await this.initWorker();
    this.loadTheModules(JSON.parse(await fs(window.DATA_STORAGE+"python_modules.json").readFile("utf8")));
    await this.runCode(
      editorManager.editor.getValue(),
    );
  }

  async terminal() {
    this.#showPage();
  }

  async runCode(code) {
    this.$page.settitle(strings['loading...']);
    this.#worker.postMessage({
      action: 'run',
      code,
    });
    try {
      const res = await new Promise((resolve, error) => {
        this.#onRunSuccess = resolve;
        this.#onRunError = error;
      });
      this.print(res, 'output');
    } catch (error) {
      this.print(error, 'error');
    }
  }
  
  async loadTheModules(packages) {
    this.#worker.postMessage({
      action: 'loadModule',
      packages,
    });
    try {
      await new Promise((resolve, error) => {
        this.#onInitSuccess = resolve;
        this.#onInitError = error;
      });
    } catch (error) {
      this.print(error, 'error');
      return;
    }
  }

  async destroy() {
    if (this.$runBtn) {
      this.$runBtn.onclick = null;
      this.$runBtn.remove();
    }

    this.#worker?.terminate();
    editorManager.off('switch-file', this.checkRunnable.bind(this));
    editorManager.off('rename-file', this.checkRunnable.bind(this));
    this.$style.remove();
    editorManager.editor.commands.removeCommad("python:install_modules")
    await fs(window.DATA_STORAGE+"python_modules.json").delete()
  }

  checkRunnable() {
    const file = editorManager.activeFile;

    if (this.$runBtn.isConnected) {
      this.$runBtn.remove();
    }

    if (file?.name.endsWith('.py')) {
      const $header = root.get('header');
      $header.get('.icon.play_arrow')?.remove();
      $header.insertBefore(this.$runBtn, $header.lastChild);
    }
  }

  print(res, type) {
    if (!this.$page.isConnected) return;
    const $output = tag('div', {
      className: `print ${type || ''}`,
      textContent: res,
    });
    this.#append($output, this.$input);
  }

  #showPage() {
    const $main = this.$page.get('.main');
    if (!this.$page.isConnected) {
      this.$page.classList.remove('hide');
      this.$page.show();
    }
    $main.innerHTML = '';
  }

  #clearConsole() {
    this.$page.get('.main').innerHTML = '';
    this.#append(this.$input);
  }

  #append(...$el) {
    const $main = this.$page.get('.main');
    if (!$main) this.$page.append(tag('div', { className: 'main' }));
    this.$page.get('.main').append(...$el);
  }

  async #workerOnMessage(e) {
    const {
      action,
      success,
      error,
      text,
    } = e.data;

    switch (action) {
      case 'init':
        this.#state = this.INITIALIZED;
        this.$page.settitle('Python');
        if (success) {
          this.#onInitSuccess();
        } else {
          this.#onInitError(error);
        }
        break;
      
      case 'loadModule':
        if (success) {
          this.#onInitSuccess();
        } else {
          this.#onInitError(error);
        }
        break;

      case 'run':
        this.$page.settitle('Python');
        if (success) {
          this.#onRunSuccess();
        } else {
          this.#onRunError(error);
        }
        break;

      case 'input':
        this.#isInput = true;
        if (text) this.print(text);
        await this.#cacheFile.writeFile('');
        this.$input.get('textarea').focus();
        break;

      case 'stdout':
        this.print(text);
        break;

      case 'stderr':
        this.print(text, 'error');
        break;

      default:
        break;
    }
  }

  #onkeydown(e) {
    const value = e.target.value;
    const lines = value.split('\n');
    const canGoUp = this.#getCursorPosition() === 1;
    const canGoDown = this.#getCursorPosition() === lines.length;
    // if up arrow is pressed, show previous code
    if (canGoUp && e.key === 'ArrowUp') {
      e.preventDefault();
      if (this.#niddle > 0) {
        this.#niddle -= 1;
        e.target.value = this.#codes[this.#niddle];
      }
    }

    // if down arrow is pressed, show next code
    if (canGoDown && e.key === 'ArrowDown') {
      e.preventDefault();
      if (this.#niddle < this.#codes.length) {
        this.#niddle += 1;
        e.target.value = this.#codes[this.#niddle] || '';
      }
    }

    // if ctrl + l is pressed, clear the input
    if (e.key === 'l' && e.ctrlKey) {
      this.#clearConsole();
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      e.target.value += '\t';
    }
  }

  #getCursorPosition() {
    const $textarea = this.$input.get('textarea');
    const {
      selectionStart,
      selectionEnd,
    } = $textarea;

    if (selectionStart !== selectionEnd) return;
    const lines = $textarea.value;

    // get the line number of the cursor
    return lines.slice(0, selectionStart).split('\n').length;
  }

  #oninput(e) {
    const $el = e.target;
    let { value } = $el;
    $el.style.height = `${$el.scrollHeight}px`;
    // check if new line is added
    if (value.endsWith('\n')) {
      if (this.#isInput) {
        this.#isInput = false;
        value = value.slice(0, -1);
        this.#cacheFile.writeFile(value + `\0${this.#inputCount++}`);
        this.print(value, 'input');
        this.$input.get('textarea').value = '';
        return;
      }

      if (!this.#isIncomplete(value)) {
        this.#codes.push(value.trim());
        this.#niddle = this.#codes.length;
        this.print(value, 'input');
        this.runCode(value);
        this.$input.get('textarea').value = '';
      }
    }
  }

  #isIncomplete(code) {
    const lines = code.trim().split('\n');
    let lastLine = lines[lines.length - 1];

    // if last line ends with ':', it is incomplete
    if (/:$/.test(lastLine)) {
      return true;
    }

    // if last line starts with tab or soft tab, it is incomplete
    if (/^\W+/.test(lastLine)) {
      if (/\n\n$/.test(code)) {
        return false;
      }
      return true;
    }

    return false;
  }
}

if (window.acode) {
  const python = new Python();
  acode.setPluginInit(plugin.id, (baseUrl, $page, { cacheFileUrl, cacheFile }) => {
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    python.baseUrl = baseUrl;
    python.init($page, cacheFile, cacheFileUrl);
  });
  acode.setPluginUnmount(plugin.id, () => {
    python.destroy();
  });
}