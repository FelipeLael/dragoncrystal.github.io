/**
 * @typedef {Object} Character
 * @property {string} name - Character name
 * @property {string} [displayName] - Display name with form number
 * @property {number} damage - Damage stat
 * @property {number} defense - Defense stat
 * @property {number} energyRate - Energy rate stat
 * @property {number} moveSpeed - Move speed stat
 * @property {boolean} beast - Whether character is a beast
 * @property {number} [averageStats] - Average of all stats
 */

/**
 * Character Database Model
 * Handles data loading, parsing and storage
 */
class CharacterModel {
    /**
     * @constructor
     */
    constructor() {
        /** @type {Character[]} */
        this.characters = [];
        /** @type {boolean} */
        this.fetchFailed = false;
    }

    /**
     * Load database from server
     * @returns {Promise<boolean>} Success status
     */
    async loadDatabase() {
        try {
            const response = await fetch('./database.txt');
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const content = await response.text();
            this.parseDatabase(content);
            this.fetchFailed = false;
            return true;
        } catch (error) {
            console.error('Error loading database:', error);
            this.fetchFailed = true;
            return false;
        }
    }

    /**
     * Load a local database file
     * @param {File} file - The file to load
     * @returns {Promise<boolean>} Success status
     */
    loadLocalFile(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                reject(new Error("No file provided"));
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                this.parseDatabase(content);
                resolve(true);
            };
            reader.onerror = () => reject(new Error("Error reading file"));
            reader.readAsText(file);
        });
    }

    /**
     * Parse database content and create character objects
     * @param {string} content - Raw database content
     */
    parseDatabase(content) {
        this.characters = content
            .split('\n')
            .filter(line => line.trim().startsWith('Character'))
            .map(line => {
                const match = line.match(/Character\s+"?([^"]+)"?:\s+Damage:\s+([\d,]+),\s+Defense:\s+([\d,]+),\s+Energy Rate:\s+([\d,]+)\s+Move Speed:\s+([\d,]+),\s+Beast:\s+(\w+)/);
                if (match) {
                    return {
                        name: match[1],
                        damage: parseFloat(match[2].replace(',', '.')),
                        defense: parseFloat(match[3].replace(',', '.')),
                        energyRate: parseFloat(match[4].replace(',', '.')),
                        moveSpeed: parseFloat(match[5].replace(',', '.')),
                        beast: match[6] === 'True'
                    };
                }
                return null;
            })
            .filter(char => char !== null);

        this.processCharacterForms();
    }

    /**
     * Process character forms and add display names
     */
    processCharacterForms() {
        // Group characters by name
        const charactersByName = {};
        this.characters.forEach(char => {
            if (!charactersByName[char.name]) {
                charactersByName[char.name] = [];
            }
            charactersByName[char.name].push(char);
        });

        // For each group of characters with the same name
        Object.keys(charactersByName).forEach(name => {
            const forms = charactersByName[name];
            
            // Calculate average stats for all forms
            forms.forEach(form => {
                form.averageStats = (form.damage + form.defense + form.energyRate + form.moveSpeed) / 4;
            });
            
            // If there are multiple forms of the same character
            if (forms.length > 1) {
                // Sort forms by their average stats (ascending)
                forms.sort((a, b) => a.averageStats - b.averageStats);
                
                // Assign form numbers
                forms.forEach((form, index) => {
                    form.displayName = `${form.name} (Form ${index + 1})`;
                });
            } else {
                // Single form - just use original name
                forms[0].displayName = forms[0].name;
            }
        });
    }

    /**
     * Sort characters by a specific column
     * @param {number} column - Column index to sort by
     * @param {number} direction - Sort direction (1 for ascending, -1 for descending)
     */
    sortCharacters(column, direction) {
        const keys = ['name', 'damage', 'defense', 'energyRate', 'moveSpeed', 'averageStats', 'beast'];
        this.characters.sort((a, b) => {
            let valA = a[keys[column]];
            let valB = b[keys[column]];
            if (typeof valA === 'string') {
                return direction * valA.localeCompare(valB);
            }
            return direction * (valA - valB);
        });
    }

    /**
     * Get all characters with optional filtering
     * @param {boolean} showingBeast - Whether to include beasts
     * @param {boolean} onlyBeast - Whether to show only beasts
     * @returns {Character[]} Filtered characters
     */
    getCharacters(showingBeast, onlyBeast) {
        return this.characters.filter(char => {
            if (!showingBeast && char.beast) {
                return false;
            }
            if (onlyBeast && !char.beast) {
                return false;
            }
            return true;
        });
    }

    /**
     * Get character count
     * @returns {number} Number of characters
     */
    getCharacterCount() {
        return this.characters.length;
    }

    /**
     * Prepare characters data for export
     * @returns {Object[]} Export-ready data
     */
    prepareForExport() {
        return this.characters.map(char => ({
            name: char.displayName || char.name,
            damage: char.damage,
            defense: char.defense,
            energyRate: char.energyRate,
            moveSpeed: char.moveSpeed,
            average: char.averageStats.toFixed(2),
            beast: char.beast
        }));
    }
}

/**
 * Dashboard View
 * Handles UI rendering and updates
 */
class DashboardView {
    /**
     * @constructor
     */
    constructor() {
        /** @type {HTMLElement} */
        this.countElement = document.getElementById('characterCount');
        /** @type {HTMLElement} */
        this.fileControls = document.getElementById('fileControls');
        /** @type {HTMLElement} */
        this.tableBody = document.getElementById('tableBody');
        /** @type {HTMLElement} */
        this.toggleBeastBtn = document.getElementById('toggleBeastBtn');
        /** @type {HTMLElement} */
        this.onlyBeastBtn = document.getElementById('onlyBeastBtn');
    }

    /**
     * Update the character count display
     * @param {string} message - Message to display
     * @param {string} [className] - Optional CSS class
     */
    updateCountDisplay(message, className = '') {
        this.countElement.textContent = message;
        this.countElement.className = className;
    }

    /**
     * Show or hide file controls
     * @param {boolean} show - Whether to show controls
     */
    showFileControls(show) {
        if (show) {
            this.fileControls.classList.remove('hidden');
        } else {
            this.fileControls.classList.add('hidden');
        }
    }

    /**
     * Update button text based on current state
     * @param {boolean} showingBeast - Whether beasts are shown
     * @param {boolean} onlyBeast - Whether only beasts are shown
     */
    updateButtonText(showingBeast, onlyBeast) {
        this.toggleBeastBtn.textContent = showingBeast ? "HideBeast" : "ShowBeast";
        this.onlyBeastBtn.textContent = onlyBeast ? "ShowAll" : "OnlyBeast";
    }

    /**
     * Render the character table
     * @param {Character[]} characters - Characters to display
     */
    renderTable(characters) {
        this.tableBody.innerHTML = '';
        
        characters.forEach(char => {
            const row = document.createElement('tr');
            
            // Add form class if character has multiple forms
            if (char.displayName && char.displayName.includes('Form')) {
                const formMatch = char.displayName.match(/Form (\d+)/);
                if (formMatch && formMatch[1]) {
                    row.classList.add(`form-${formMatch[1]}`);
                }
            }
            
            row.innerHTML = `
                <td>${char.displayName || char.name}</td>
                <td>${char.damage}</td>
                <td>${char.defense}</td>
                <td>${char.energyRate}</td>
                <td>${char.moveSpeed}</td>
                <td>${char.averageStats.toFixed(2)}</td>
                <td>${char.beast}</td>
            `;
            this.tableBody.appendChild(row);
        });
    }

    /**
     * Get the selected file from the file input
     * @returns {File|null} The selected file or null
     */
    getSelectedFile() {
        const fileInput = document.getElementById('databaseFile');
        return fileInput.files[0] || null;
    }
}

/**
 * Dashboard Controller
 * Handles business logic and connects model and view
 */
class DashboardController {
    /**
     * @constructor
     */
    constructor() {
        /** @type {CharacterModel} */
        this.model = new CharacterModel();
        /** @type {DashboardView} */
        this.view = new DashboardView();
        /** @type {boolean} */
        this.showingBeast = true;
        /** @type {boolean} */
        this.onlyBeast = false;
        /** @type {number} */
        this.sortDirection = 1;
        /** @type {number} */
        this.lastSortedColumn = -1;

        this.bindEvents();
    }

    /**
     * Bind event handlers
     */
    bindEvents() {
        // Bind table header clicks for sorting
        const headers = document.querySelectorAll('th');
        headers.forEach((header, index) => {
            header.addEventListener('click', () => {
                this.sortTable(index);
            });
        });

        // Bind button clicks using the correct ID selectors
        document.getElementById('toggleBeastBtn').addEventListener('click', () => this.toggleBeastView());
        document.getElementById('onlyBeastBtn').addEventListener('click', () => this.showOnlyBeast());
        document.getElementById('reloadBtn').addEventListener('click', () => this.reloadDatabase());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportToExcel());
        document.getElementById('loadFileBtn')?.addEventListener('click', () => this.loadLocalFile());
    }

    /**
     * Initialize the dashboard
     */
    async init() {
        try {
            this.view.updateCountDisplay("Loading database...", "loading");
            this.view.showFileControls(false);
            this.view.updateButtonText(this.showingBeast, this.onlyBeast);
            
            console.log("Attempting to load database...");
            const success = await this.model.loadDatabase();
            console.log("Database load result:", success);
            
            if (success) {
                this.view.updateCountDisplay(`${this.model.getCharacterCount()} characters loaded`);
                this.refreshTable();
            } else {
                this.view.updateCountDisplay("Automatic loading failed. Please use the manual file selector below.", "error");
                this.view.showFileControls(true);
            }
        } catch (error) {
            console.error("Error during initialization:", error);
            this.view.updateCountDisplay("Error loading database. Please use the manual file selector below.", "error");
            this.view.showFileControls(true);
        }
    }

    /**
     * Reload the database
     */
    async reloadDatabase() {
        this.view.updateCountDisplay("Reloading database...", "loading");
        
        if (this.model.fetchFailed) {
            await this.loadLocalFile();
        } else {
            const success = await this.model.loadDatabase();
            if (success) {
                this.view.updateCountDisplay(`${this.model.getCharacterCount()} characters loaded`);
                this.refreshTable();
            } else {
                this.view.updateCountDisplay("Reload failed. Please try the manual file selector.", "error");
                this.view.showFileControls(true);
            }
        }
    }

    /**
     * Load a local database file
     */
    async loadLocalFile() {
        const file = this.view.getSelectedFile();
        if (!file) {
            alert("Please select a database file first.");
            return;
        }
        
        this.view.updateCountDisplay("Reading file...", "loading");
        try {
            await this.model.loadLocalFile(file);
            this.view.updateCountDisplay(`${this.model.getCharacterCount()} characters loaded`);
            this.refreshTable();
        } catch (error) {
            this.view.updateCountDisplay("Error reading file", "error");
        }
    }

    /**
     * Toggle beast character visibility
     */
    toggleBeastView() {
        this.showingBeast = !this.showingBeast;
        
        // If we're hiding beasts, then "OnlyBeast" doesn't make sense, so reset it
        if (!this.showingBeast) {
            this.onlyBeast = false;
        }
        
        this.view.updateButtonText(this.showingBeast, this.onlyBeast);
        this.refreshTable();
    }

    /**
     * Toggle showing only beast characters
     */
    showOnlyBeast() {
        this.onlyBeast = !this.onlyBeast;
        
        // If we're showing only beasts, then showingBeast must be true
        if (this.onlyBeast) {
            this.showingBeast = true;
        }
        
        this.view.updateButtonText(this.showingBeast, this.onlyBeast);
        this.refreshTable();
    }

    /**
     * Sort the table by column
     * @param {number} column - Column index to sort by
     */
    sortTable(column) {
        if (this.lastSortedColumn === column) {
            this.sortDirection *= -1;
        } else {
            this.sortDirection = 1;
        }
        this.lastSortedColumn = column;

        this.model.sortCharacters(column, this.sortDirection);
        this.refreshTable();
    }

    /**
     * Refresh the character table
     */
    refreshTable() {
        const characters = this.model.getCharacters(this.showingBeast, this.onlyBeast);
        this.view.renderTable(characters);
    }

    /**
     * Export table data to Excel
     */
    exportToExcel() {
        if (this.model.getCharacterCount() === 0) {
            alert("No data to export. Please wait for the database to load or reload.");
            return;
        }
        
        const exportData = this.model.prepareForExport();
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Characters');
        XLSX.writeFile(workbook, 'characters.xlsx');
    }
}

/**
 * Global app instance for HTML onclick access
 */
let appInstance;

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    appInstance = new DashboardController();
    appInstance.init();
    
    // Add global functions for HTML onclick attributes
    window.sortTable = (column) => appInstance.sortTable(column);
    window.toggleBeastView = () => appInstance.toggleBeastView();
    window.showOnlyBeast = () => appInstance.showOnlyBeast();
    window.reloadDatabase = () => appInstance.reloadDatabase();
    window.loadLocalFile = () => appInstance.loadLocalFile();
    window.exportToExcel = () => appInstance.exportToExcel();
});
