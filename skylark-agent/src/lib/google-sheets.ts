import { google } from 'googleapis';

// ─── Google Sheets Service ────────────────────────────────────────────────────

class GoogleSheetsService {
    private sheets;
    private spreadsheetId: string;
    private initialized = false;

    constructor() {
        const rawSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
        this.spreadsheetId = rawSpreadsheetId === 'your_spreadsheet_id_here' ? '' : rawSpreadsheetId;

        const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '';
        const privateKey = (process.env.GOOGLE_SHEETS_PRIVATE_KEY || '').replace(
            /\\n/g,
            '\n'
        );

        const hasValidCreds =
            clientEmail &&
            clientEmail !== 'your_service_account_email_here' &&
            privateKey &&
            !privateKey.includes('your_private_key_here') &&
            this.spreadsheetId;

        if (hasValidCreds) {
            const auth = new google.auth.JWT(clientEmail, undefined, privateKey, [
                'https://www.googleapis.com/auth/spreadsheets',
            ]);
            this.sheets = google.sheets({ version: 'v4', auth });
            this.initialized = true;
        } else {
            console.log(
                'ℹ️  Google Sheets sync is disabled (local mode enabled).'
            );
            this.sheets = null;
        }
    }

    isConfigured(): boolean {
        return this.initialized;
    }

    // ── Read Operations ─────────────────────────────────────────────────────

    async readSheet(range: string): Promise<string[][] | null> {
        if (!this.sheets) return null;

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range,
            });
            return response.data.values as string[][] || null;
        } catch (error) {
            console.error(`Error reading sheet range ${range}:`, error);
            return null;
        }
    }

    // ── Write Operations ────────────────────────────────────────────────────

    async updateSheet(
        range: string,
        values: string[][]
    ): Promise<boolean> {
        if (!this.sheets) {
            console.warn('Google Sheets not configured — skipping sync.');
            return false;
        }

        try {
            await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: { values },
            });
            return true;
        } catch (error) {
            console.error(`Error updating sheet range ${range}:`, error);
            return false;
        }
    }

    // ── Pilot Status Sync ──────────────────────────────────────────────────

    async syncPilotStatus(
        pilotId: string,
        status: string,
        assignment: string
    ): Promise<boolean> {
        if (!this.sheets) return false;

        try {
            // Read the pilot roster sheet to find the row
            const data = await this.readSheet('pilot_roster!A:I');
            if (!data) return false;

            // Find the row with matching pilot_id
            const rowIndex = data.findIndex(row => row[0] === pilotId);
            if (rowIndex === -1) return false;

            // Update status (column F = 6th column) and assignment (column G = 7th column)
            const statusRange = `pilot_roster!F${rowIndex + 1}`;
            const assignmentRange = `pilot_roster!G${rowIndex + 1}`;

            await this.updateSheet(statusRange, [[status]]);
            await this.updateSheet(assignmentRange, [[assignment]]);

            console.log(
                `✅ Synced pilot ${pilotId}: status=${status}, assignment=${assignment}`
            );
            return true;
        } catch (error) {
            console.error(`Error syncing pilot ${pilotId}:`, error);
            return false;
        }
    }

    // ── Drone Status Sync ──────────────────────────────────────────────────

    async syncDroneStatus(
        droneId: string,
        status: string,
        assignment: string
    ): Promise<boolean> {
        if (!this.sheets) return false;

        try {
            const data = await this.readSheet('drone_fleet!A:H');
            if (!data) return false;

            const rowIndex = data.findIndex(row => row[0] === droneId);
            if (rowIndex === -1) return false;

            // Update status (column D = 4th column) and assignment (column F = 6th column)
            const statusRange = `drone_fleet!D${rowIndex + 1}`;
            const assignmentRange = `drone_fleet!F${rowIndex + 1}`;

            await this.updateSheet(statusRange, [[status]]);
            await this.updateSheet(assignmentRange, [[assignment]]);

            console.log(
                `✅ Synced drone ${droneId}: status=${status}, assignment=${assignment}`
            );
            return true;
        } catch (error) {
            console.error(`Error syncing drone ${droneId}:`, error);
            return false;
        }
    }

    // ── Full Sync (Read from Sheets → Update Local Data) ───────────────────

    async fullSync(): Promise<{
        pilots: Record<string, string>[];
        drones: Record<string, string>[];
        missions: Record<string, string>[];
    } | null> {
        if (!this.sheets) return null;

        try {
            const pilotData = await this.readSheet('pilot_roster!A:I');
            const droneData = await this.readSheet('drone_fleet!A:H');
            const missionData = await this.readSheet('missions!A:J');

            const toRecords = (data: string[][] | null) => {
                if (!data || data.length < 2) return [];
                const headers = data[0];
                return data.slice(1).map(row => {
                    const record: Record<string, string> = {};
                    headers.forEach((h, i) => {
                        record[h] = row[i] || '';
                    });
                    return record;
                });
            };

            return {
                pilots: toRecords(pilotData),
                drones: toRecords(droneData),
                missions: toRecords(missionData),
            };
        } catch (error) {
            console.error('Error during full sync:', error);
            return null;
        }
    }
}

// Singleton export
export const sheetsService = new GoogleSheetsService();
