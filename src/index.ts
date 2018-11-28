import { existsSync, readFileSync } from 'fs';
import { dirname, join, relative } from 'path';
import * as TsModule from 'typescript/lib/tsserverlibrary';

type Omit<T, V extends keyof T> = Pick<T, Exclude<keyof T, V>>;

interface IConfig {
  extends?: string;
}

interface IPluginInformation
  extends Omit<ts.server.PluginCreateInfo, 'config'> {
  config: IConfig;
}

interface IConfigJSONFile {
  compilerOptions: TsModule.CompilerOptions;
}

const getJsonFile = (path: string): IConfigJSONFile | null => {
  if (existsSync(path)) {
    const jsonString = readFileSync(path, 'utf8');
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
  }
  return null;
};

export default function init(modules: { typescript: typeof TsModule }) {
  function create(pluginInformation: IPluginInformation) {
    const extendsPath = pluginInformation.config.extends;

    const { info } = pluginInformation.project.projectService.logger;
    const log = (content: any) => {
      info(`TYPESCRIPT-PLUGIN-EXTEND-PATHS: ${content}`);
    };

    log('!!! Launching the plugin');

    if (!extendsPath) {
      log('No extends path set in the config... EXITING!');
      return;
    }

    const rootPath = dirname(pluginInformation.project.getProjectName());
    const extendsDir = dirname(extendsPath);
    const rootTsConfig = getJsonFile(extendsPath);

    if (
      !rootTsConfig ||
      !rootTsConfig.compilerOptions ||
      !rootTsConfig.compilerOptions.paths ||
      !rootTsConfig.compilerOptions.paths.length
    ) {
      log(
        'Invalid configuration of your root TSConfig - make sure the path is correct.'
      );
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

      const relativeDir = relative(oldOptions.baseUrl, extendsDir);

      /* The paths to merge current path configuration with */
      const transformedMergePaths = Object.keys(mergePaths).reduce(
        (acc, curr) => {
          const currentPaths = mergePaths[curr];
          const paths = Array.isArray(currentPaths)
            ? currentPaths.map(path => join(relativeDir, path))
            : typeof currentPaths === 'string'
            ? [join(relativeDir, currentPaths)]
            : [];
          return { ...acc, [curr]: paths };
        },
        {}
      );

      return {
        ...oldOptions,
        paths: {
          ...transformedMergePaths,
          ...oldOptions.paths,
        },
      };
    };

    let replacer = (s: string) => s;
    let remainingGood = (_s: string) => true;
    Object.keys(mergePaths).forEach(p => {
      const pathVal = mergePaths[p];
      const replacement = '"' + p.replace('*', '$1') + '"';
      const searchment = new RegExp(
        '[\'"]' + pathVal[0].replace('*', '(.+)') + '[\'"]'
      );
      const modulePattern = new RegExp(pathVal[0].replace('*', '(.+)') + '/');
      const oldReplacer = replacer;
      const oldTester = remainingGood;
      replacer = fileImport => {
        const res = oldReplacer(fileImport);
        const next = res.replace(searchment, replacement);
        // log(`${res} -> ${next} ;; via ${searchment} -> ${replacement}`);
        return next;
      };
      remainingGood = s => {
        const old = oldTester(s) && !modulePattern.test(s);
        return old;
      };
    });

    const originalGetCodeFixesAtPosition =
      pluginInformation.languageService.getCodeFixesAtPosition;

    pluginInformation.languageService.getCodeFixesAtPosition = function(
      ...args
    ): ReadonlyArray<ts.CodeFixAction> {
      const results = originalGetCodeFixesAtPosition.apply(
        this,
        args
      ) as ReadonlyArray<ts.CodeFixAction>;
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

module.exports = init;
exports = init;
