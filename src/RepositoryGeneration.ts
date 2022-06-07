import * as Handlebars from "handlebars";
import * as Prettier from "prettier";
import * as changeCase from "change-case";
import * as fs from "fs";
import * as path from "path";
import IConnectionOptions from "./IConnectionOptions";
import IGenerationOptions from "./IGenerationOptions";
import { Relation } from "./models/Relation";
import { Repository } from "./models/Repository";

const prettierOptions: Prettier.Options = {
    parser: "typescript",
    endOfLine: "auto",
};

export default function repositoryGenerationPhase(
    connectionOptions: IConnectionOptions,
    generationOptions: IGenerationOptions,
    databaseModel: Repository[]
): void {
    createHandlebarsHelpers(generationOptions);

    const resultPath = generationOptions.resultsPath;
    if (!fs.existsSync(resultPath)) {
        fs.mkdirSync(resultPath);
    }
    let repositoriesPath = resultPath;
    if (!generationOptions.noConfigs) {
        const tsconfigPath = path.resolve(resultPath, "tsconfig.json");
        const typeormConfigPath = path.resolve(resultPath, "ormconfig.json");

        createTsConfigFile(tsconfigPath);
        createTypeOrmConfig(typeormConfigPath, connectionOptions);
        repositoriesPath = path.resolve(resultPath, "./repositories");
        if (!fs.existsSync(repositoriesPath)) {
            fs.mkdirSync(repositoriesPath);
        }
    }

    generateRepositories(databaseModel, generationOptions, repositoriesPath);
}

function generateRepositories(
    databaseModel: Repository[],
    generationOptions: IGenerationOptions,
    repositoriesPath: string
) {
    const repositoryTemplatePath = path.resolve(
        __dirname,
        "templates",
        "repository.mst"
    );
    const repositoryTemplate = fs.readFileSync(repositoryTemplatePath, "utf-8");
    const repositoryCompliedTemplate = Handlebars.compile(repositoryTemplate, {
        noEscape: true,
    });
    databaseModel.forEach((element) => {
        console.log('element', { ...element });
        const casedFileName = changeCase.pascalCase(element.fileName);

        const resultFilePath = path.resolve(
            repositoriesPath,
            `${casedFileName}Repository.ts`
        );

        element.repositoryName = casedFileName;
        const rendered = repositoryCompliedTemplate(element);

        let formatted = "";
        try {
            formatted = Prettier.format(rendered, prettierOptions);
        } catch (error) {
            console.error(
                "There were some problems with repository generation for table: ",
                element.sqlName
            );
            console.error(error);
            formatted = Prettier.format(rendered, prettierOptions);
        }
        fs.writeFileSync(resultFilePath, formatted, {
            encoding: "utf-8",
            flag: "w",
        });
    });
}

function createHandlebarsHelpers(generationOptions: IGenerationOptions): void {
    Handlebars.registerHelper("json", (context) => {
        const json = JSON.stringify(context);
        const withoutQuotes = json.replace(/"([^(")"]+)":/g, "$1:");
        return withoutQuotes.slice(1, withoutQuotes.length - 1);
    });
    Handlebars.registerHelper("toEntityName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseEntity) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return retStr;
    });
    Handlebars.registerHelper("toFileName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseFile) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "param":
                retStr = changeCase.paramCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            default:
                throw new Error("Unknown case style");
        }
        return retStr;
    });
    Handlebars.registerHelper("printPropertyVisibility", () =>
        generationOptions.propertyVisibility !== "none"
            ? `${generationOptions.propertyVisibility} `
            : ""
    );
    Handlebars.registerHelper("toPropertyName", (str) => {
        let retStr = "";
        switch (generationOptions.convertCaseProperty) {
            case "camel":
                retStr = changeCase.camelCase(str);
                break;
            case "pascal":
                retStr = changeCase.pascalCase(str);
                break;
            case "none":
                retStr = str;
                break;
            case "snake":
                retStr = changeCase.snakeCase(str);
                break;
            default:
                throw new Error("Unknown case style");
        }
        return retStr;
    });
    Handlebars.registerHelper(
        "toRelation",
        (entityType: string, relationType: Relation["relationType"]) => {
            let retVal = entityType;
            if (relationType === "ManyToMany" || relationType === "OneToMany") {
                retVal = `${retVal}[]`;
            }
            if (generationOptions.lazy) {
                retVal = `Promise<${retVal}>`;
            }
            return retVal;
        }
    );
    Handlebars.registerHelper("defaultExport", () =>
        generationOptions.exportType === "default" ? "default" : ""
    );
    Handlebars.registerHelper("localImport", (entityName: string) =>
        generationOptions.exportType === "default"
            ? entityName
            : `{${entityName}}`
    );
    Handlebars.registerHelper("strictMode", () =>
        generationOptions.strictMode !== "none"
            ? generationOptions.strictMode
            : ""
    );
    Handlebars.registerHelper({
        and: (v1, v2) => v1 && v2,
        eq: (v1, v2) => v1 === v2,
        gt: (v1, v2) => v1 > v2,
        gte: (v1, v2) => v1 >= v2,
        lt: (v1, v2) => v1 < v2,
        lte: (v1, v2) => v1 <= v2,
        ne: (v1, v2) => v1 !== v2,
        or: (v1, v2) => v1 || v2,
    });
}

function createTsConfigFile(tsconfigPath: string): void {
    if (fs.existsSync(tsconfigPath)) {
        console.warn(
            `\x1b[33m[${new Date().toLocaleTimeString()}] WARNING: Skipping generation of tsconfig.json file. File already exists. \x1b[0m`
        );
        return;
    }
    const templatePath = path.resolve(__dirname, "templates", "tsconfig.mst");
    const template = fs.readFileSync(templatePath, "utf-8");
    const compliedTemplate = Handlebars.compile(template, {
        noEscape: true,
    });
    const rendered = compliedTemplate({});
    const formatted = Prettier.format(rendered, { parser: "json" });
    fs.writeFileSync(tsconfigPath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}
function createTypeOrmConfig(
    typeormConfigPath: string,
    connectionOptions: IConnectionOptions
): void {
    if (fs.existsSync(typeormConfigPath)) {
        console.warn(
            `\x1b[33m[${new Date().toLocaleTimeString()}] WARNING: Skipping generation of ormconfig.json file. File already exists. \x1b[0m`
        );
        return;
    }
    const templatePath = path.resolve(__dirname, "templates", "ormconfig.mst");
    const template = fs.readFileSync(templatePath, "utf-8");
    const compiledTemplate = Handlebars.compile(template, {
        noEscape: true,
    });
    const rendered = compiledTemplate(connectionOptions);
    const formatted = Prettier.format(rendered, { parser: "json" });
    fs.writeFileSync(typeormConfigPath, formatted, {
        encoding: "utf-8",
        flag: "w",
    });
}
