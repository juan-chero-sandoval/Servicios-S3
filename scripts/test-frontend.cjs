// Alternativa con Node.js para ejecutar las mismas pruebas sin instalar paquetes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ console });
const files = ['core/api-client.js', 'models/session-model.js', 'models/vale-model.js',
    'models/atencion-model.js', 'models/login-model.js', 'controllers/login-controller.js', 'controllers/atencion-controller.js', 'views/formatters.js'];
for (const file of files) vm.runInContext(fs.readFileSync(path.join(root, 'src/main/resources/static/js', file), 'utf8'), context, { filename: file });
vm.runInContext(fs.readFileSync(path.join(__dirname, 'tests/frontend-mvc.spec.js'), 'utf8'), context);
vm.runInContext('runFrontendTests()', context).then(results => {
    for (const name of results) console.log('OK ' + name);
    console.log(results.length + ' pruebas MVC correctas.');
}, error => { console.error(error); process.exitCode = 1; });
