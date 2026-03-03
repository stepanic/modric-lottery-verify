import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

const MEDIA_DIR = path.resolve('media');
const ASSETS_DIR = path.resolve('assets/images');

// Create assets directory if it doesn't exist
if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// Logic resolutions (retina @2x will be double)
const LOGICAL_WIDTH = 800;
const RETINA_WIDTH = LOGICAL_WIDTH * 2;

async function optimizeImages() {
    const files = fs.readdirSync(MEDIA_DIR);

    for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.heic'].includes(ext)) continue;

        console.log(`Processing ${file}...`);

        let sourcePath = path.join(MEDIA_DIR, file);
        let tmpPath = null;

        // Convert HEIC to JPG via macOS sips before passing to sharp
        if (ext === '.heic') {
            tmpPath = path.join('/tmp', file.replace(/\.heic$/i, '.jpg'));
            console.log(`  Converting HEIC to JPG via sips...`);
            execSync(`sips -s format jpeg "${sourcePath}" --out "${tmpPath}"`);
            sourcePath = tmpPath;
        }

        const baseName = path.basename(file, path.extname(file));

        // Output paths
        const out1x = path.join(ASSETS_DIR, `${baseName}.webp`);
        const out2x = path.join(ASSETS_DIR, `${baseName}@2x.webp`);

        try {
            // Create @2x version (retina)
            await sharp(sourcePath)
                .rotate()
                .resize({ width: RETINA_WIDTH, withoutEnlargement: true })
                .webp({ quality: 75, effort: 6 })
                .toFile(out2x);

            console.log(`  Created ${out2x}`);

            // Create @1x version (standard)
            await sharp(sourcePath)
                .rotate()
                .resize({ width: LOGICAL_WIDTH, withoutEnlargement: true })
                .webp({ quality: 70, effort: 6 })
                .toFile(out1x);

            console.log(`  Created ${out1x}`);
        } catch (err) {
            console.error(`  Error processing ${file}:`, err);
        }

        // Cleanup tmp file if generated
        if (tmpPath && fs.existsSync(tmpPath)) {
            fs.unlinkSync(tmpPath);
        }
    }

    console.log('Image optimization complete!');
}

optimizeImages();
