import * as TomgUtils from "./Utils";
import AbstractDriver from "./drivers/AbstractDriver";
import MssqlDriver from "./drivers/MssqlDriver";
import MariaDbDriver from "./drivers/MariaDbDriver";
import IConnectionOptions from "./IConnectionOptions";
import IGenerationOptions from "./IGenerationOptions";
import PostgresDriver from "./drivers/PostgresDriver";
import MysqlDriver from "./drivers/MysqlDriver";
import OracleDriver from "./drivers/OracleDriver";
import SqliteDriver from "./drivers/SqliteDriver";
import modelCustomizationPhase from "./ModelCustomization";
import modelGenerationPhase from "./ModelGeneration";
import { Entity } from "./models/Entity";
import repositoryGenerationPhase from "./RepositoryGeneration";
import typeGenerationPhase from "./TypeGeneration";

export function createDriver(driverName: string): AbstractDriver {
    switch (driverName) {
        case "mssql":
            return new MssqlDriver();
        case "postgres":
            return new PostgresDriver();
        case "mysql":
            return new MysqlDriver();
        case "mariadb":
            return new MariaDbDriver();
        case "oracle":
            return new OracleDriver();
        case "sqlite":
            return new SqliteDriver();
        default:
            TomgUtils.LogError("Database engine not recognized.", false);
            throw new Error("Database engine not recognized.");
    }
}

export async function createModelFromDatabase(
    driver: AbstractDriver,
    connectionOptions: IConnectionOptions,
    generationOptions: IGenerationOptions
): Promise<void> {
    let dbModel = await dataCollectionPhase(
        driver,
        connectionOptions,
        generationOptions
    );
    if (dbModel.length === 0) {
        TomgUtils.LogError(
            "Tables not found in selected database. Skipping creation of typeorm model.",
            false
        );
        return;
    }
    dbModel = modelCustomizationPhase(
        dbModel,
        generationOptions,
        driver.defaultValues
    );
    modelGenerationPhase(connectionOptions, generationOptions, dbModel);
}

export async function createTypeFromDatabase(
    driver: AbstractDriver,
    connectionOptions: IConnectionOptions,
    generationOptions: IGenerationOptions
): Promise<void> {
    let dbModel = await dataCollectionPhase(
        driver,
        connectionOptions,
        generationOptions
    );
    if (dbModel.length === 0) {
        TomgUtils.LogError(
            "Tables not found in selected database. Skipping creation of typeorm type.",
            false
        );
        return;
    }
    dbModel = modelCustomizationPhase(
        dbModel,
        generationOptions,
        driver.defaultValues
    );
    typeGenerationPhase(connectionOptions, generationOptions, dbModel);
}

export async function createRepositoryFromDatabase(
    driver: AbstractDriver,
    connectionOptions: IConnectionOptions,
    generationOptions: IGenerationOptions
): Promise<void> {
    let dbModel = await dataCollectionPhase(
        driver,
        connectionOptions,
        generationOptions
    );
    if (dbModel.length === 0) {
        TomgUtils.LogError(
            "Tables not found in selected database. Skipping creation of typeorm repository.",
            false
        );
        return;
    }
    dbModel = modelCustomizationPhase(
        dbModel,
        generationOptions,
        driver.defaultValues
    );
    repositoryGenerationPhase(connectionOptions, generationOptions, dbModel);
}

export async function dataCollectionPhase(
    driver: AbstractDriver,
    connectionOptions: IConnectionOptions,
    generationOptions: IGenerationOptions
): Promise<Entity[]> {
    return driver.GetDataFromServer(connectionOptions, generationOptions);
}
