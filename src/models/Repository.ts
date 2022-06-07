export type Repository = {
    sqlName: string;
    tscName: string;

    database?: string;
    schema?: string;
    repositoryName?: string;

    // TODO: move to sub-object or use handlebars helpers(?)
    fileName: string;
    fileImports: {
        entityName: string;
        fileName: string;
    }[];
    activeRecord?: true;
};
