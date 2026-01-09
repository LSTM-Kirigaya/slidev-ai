import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';

export async function initDatabase() {
    const isDev = process.env.NODE_ENV === 'development';

    // Get database configuration
    const dbPath = 'database.sqlite';
    const dbAbsolutePath = join(process.cwd(), dbPath);

    // Check if database file exists, and handle the case where Docker created a directory instead of a file
    if (existsSync(dbAbsolutePath)) {
        const stats = statSync(dbAbsolutePath);
        if (stats.isDirectory()) {
            console.log(`❌ Found directory instead of database file at ${dbAbsolutePath}. Removing directory and will create database file.`);
            // Remove the directory that was incorrectly created
            unlinkSync(dbAbsolutePath);
        } else {
            console.log(`✅ Database file found at ${dbAbsolutePath}`);
        }
    } else {
        console.log(`Database file not found at ${dbAbsolutePath}, it will be created automatically.`);
    }

    // Ensure the directory for the database exists
    const dbDir = dirname(dbAbsolutePath);
    if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
    }

    const app = await NestFactory.create(AppModule);
    const dataSource = app.get(DataSource);

    // In production, we might want to run migrations instead of synchronize
    if (process.env.NODE_ENV !== 'production') {
        await dataSource.synchronize();
        console.log('✅ Database schema synchronized (development mode)');
    } else {
        await dataSource.runMigrations();
        console.log('⚠️ Production mode: Skipping auto-sync, recommend using migrations');
    }

    await app.close();
}

initDatabase().catch((error) => {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
});