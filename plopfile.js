const path = require('path')

const SRC_PATH = path.join(__dirname, 'scarlet/cms/static/scarlet/source')

module.exports = function (plop) {
    plop.setGenerator('view', {
        description: 'new backbone view',
        prompts: [{
            type: 'input',
            name: 'name',
            message: 'What is your view name?',
            validate: function (value) {
                if ((/.+/).test(value)) { return true; }
                return 'name is required';
            }
        }],
        actions: [{
            type: 'add',
            path: SRC_PATH + '/js/views/{{name}}.js',
            templateFile: 'plopTemplates/view.js'
        }]
    });
};