import * as TsModule from 'typescript/lib/tsserverlibrary';
declare type Omit<T, V extends keyof T> = Pick<T, Exclude<keyof T, V>>;
interface IConfig {
    extends?: string;
}
interface IPluginInformation extends Omit<ts.server.PluginCreateInfo, 'config'> {
    config: IConfig;
}
export default function init(modules: {
    typescript: typeof TsModule;
}): {
    create: (pluginInformation: IPluginInformation) => TsModule.LanguageService | undefined;
};
export {};
