import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from './app.module';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

async function initDatabase() {
    const isDev = process.env.NODE_ENV === 'development';
    
    // Get database configuration from environment or default
    let dbPath: string;
    if (process.env.DATABASE_PATH) {
        dbPath = process.env.DATABASE_PATH;
    } else {
        // Default to 'database.sqlite' in production, but could be configurable
        dbPath = 'database.sqlite';
    }
    
    const fullPath = join(process.cwd(), dbPath);
    const dbDir = join(process.cwd(), ...dbPath.split('/').slice(0, -1)); // Extract directory path
    
    // Ensure the directory for the database exists
    if (dbDir && !existsSync(dbDir)) {
        console.log(`Database directory does not exist at: ${dbDir}, creating it...`);
        mkdirSync(dbDir, { recursive: true });
        console.log('✅ Database directory created.');
    }
    
    // Check if database file exists
    if (!existsSync(fullPath)) {
        console.log(`Database file does not exist at: ${fullPath}, it will be created automatically on first connection.`);
    } else {
        console.log(`✅ Database file found at: ${fullPath}`);
    }

    const app = await NestFactory.create(AppModule);
    const dataSource = app.get(DataSource);

    // Connect to the database
    if (!dataSource.isInitialized) {
        await dataSource.initialize();
        console.log('✅ Database connection established.');
    }

    // In non-production environments, synchronize schema
    // In production, migrations should be used instead
    if (process.env.NODE_ENV !== 'production') {
        await dataSource.synchronize(true);
        console.log('✅ Database schema synchronized.');
    } else {
        console.log('⚠️ Production mode: Schema synchronization skipped. Consider using migrations for production.');
    }

    // Test the connection by trying to get table names
    try {
        const entities = dataSource.entityMetadatas;
        console.log(`✅ Connected to database with ${entities.length} entities registered.`);
        
        if (entities.length > 0) {
            console.log('Registered entities:', entities.map(e => e.name).join(', '));
        }
    } catch (err) {
        console.error('❌ Error verifying database connection:', err);
    }

    await app.close();
    console.log('✅ Database initialization completed successfully.');
}

initDatabase().catch((error) => {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
});