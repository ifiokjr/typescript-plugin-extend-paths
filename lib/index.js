"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const path_1 = require("path");
const getJsonFile = (path) => {
    if (fs_1.existsSync(path)) {
        const jsonString = fs_1.readFileSync(path, 'utf8');
        try {
            return JSON.parse(jsonString);
        }
        catch (e) {
            return null;
        }
    }
    return null;
};
function init(modules) {
    function create(pluginInformation) {
        const extendsPath = pluginInformation.config.extends;
        const { info } = pluginInformation.project.projectService.logger;
        const log = (content) => {
            info(`TYPESCRIPT-PLUGIN-EXTEND-PATHS: ${content}`);
        };
        log('!!! Launching the plugin');
        if (!extendsPath) {
            log('No extends path set in the config... EXITING!');
            return;
        }
        const rootPath = path_1.dirname(pluginInformation.project.getProjectName());
        const extendsDir = path_1.dirname(extendsPath);
        const rootTsConfig = getJsonFile(extendsPath);
        if (!rootTsConfig ||
            !rootTsConfig.compilerOptions ||
            !rootTsConfig.compilerOptions.paths ||
            !rootTsConfig.compilerOptions.paths.length) {
            log('Invalid configuration of your root TSConfig - make sure the path is correct.');
            return;
        }
        const mergePaths = rootTsConfig.compilerOptions.paths;
        const oldGetCompilerOptions = pluginInformation.project.getCompilerOptions;
        pluginInformation.project.getCompilerOptions = () => {
            const oldOptions = oldGetCompilerOptions();
            if (!oldOptions.paths || !oldOptions.baseUrl) {
                log('This plugin is only needed when there are paths defined.');
                return oldOptions;
            }
            const relativeDir = path_1.relative(oldOptions.baseUrl, extendsDir);
            const transformedMergePaths = Object.keys(mergePaths).reduce((acc, curr) => {
                const currentPaths = mergePaths[curr];
                const paths = Array.isArray(currentPaths)
                    ? currentPaths.map(path => path_1.join(relativeDir, path))
                    : typeof currentPaths === 'string'
                        ? [path_1.join(relativeDir, currentPaths)]
                        : [];
                return Object.assign({}, acc, { [curr]: paths });
            }, {});
            return Object.assign({}, oldOptions, { paths: Object.assign({}, transformedMergePaths, oldOptions.paths) });
        };
        let replacer = (s) => s;
        let remainingGood = (_s) => true;
        Object.keys(mergePaths).forEach(p => {
            const pathVal = mergePaths[p];
            const replacement = '"' + p.replace('*', '$1') + '"';
            const searchment = new RegExp('[\'"]' + pathVal[0].replace('*', '(.+)') + '[\'"]');
            const modulePattern = new RegExp(pathVal[0].replace('*', '(.+)') + '/');
            const oldReplacer = replacer;
            const oldTester = remainingGood;
            replacer = fileImport => {
                const res = oldReplacer(fileImport);
                const next = res.replace(searchment, replacement);
                return next;
            };
            remainingGood = s => {
                const old = oldTester(s) && !modulePattern.test(s);
                return old;
            };
        });
        const originalGetCodeFixesAtPosition = pluginInformation.languageService.getCodeFixesAtPosition;
        pluginInformation.languageService.getCodeFixesAtPosition = function (...args) {
            const results = originalGetCodeFixesAtPosition.apply(this, args);
            results.forEach(res => {
                if (!res.description.match(/import.+from module/i)) {
                    return res;
                }
                res.description = replacer(res.description);
                res.changes.forEach(c => {
                    c.textChanges.forEach(t => {
                        t.newText = replacer(t.newText);
                    });
                });
            });
            return results.filter(res => remainingGood(res.description));
        };
        return pluginInformation.languageService;
    }
    return { create };
}
exports.default = init;
module.exports = init;
exports = init;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyQkFBOEM7QUFDOUMsK0JBQStDO0FBa0IvQyxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQVksRUFBMEIsRUFBRTtJQUMzRCxJQUFJLGVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNwQixNQUFNLFVBQVUsR0FBRyxpQkFBWSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5QyxJQUFJO1lBQ0YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQy9CO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixPQUFPLElBQUksQ0FBQztTQUNiO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMsQ0FBQztBQUVGLFNBQXdCLElBQUksQ0FBQyxPQUF3QztJQUNuRSxTQUFTLE1BQU0sQ0FBQyxpQkFBcUM7UUFDbkQsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztRQUVyRCxNQUFNLEVBQUUsSUFBSSxFQUFFLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDakUsTUFBTSxHQUFHLEdBQUcsQ0FBQyxPQUFZLEVBQUUsRUFBRTtZQUMzQixJQUFJLENBQUMsbUNBQW1DLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDO1FBRUYsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLFdBQVcsRUFBRTtZQUNoQixHQUFHLENBQUMsK0NBQStDLENBQUMsQ0FBQztZQUNyRCxPQUFPO1NBQ1I7UUFFRCxNQUFNLFFBQVEsR0FBRyxjQUFPLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUM7UUFDckUsTUFBTSxVQUFVLEdBQUcsY0FBTyxDQUFD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