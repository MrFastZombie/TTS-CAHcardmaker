const fs = require('fs');
const j = require('jimp');
const jimp = j.Jimp;
const parse = require('csv-parse/sync');

async function createCard(type, text, out) {
    let img;
    let font;
    if(type == "black") {
        img = await jimp.read("./cardassets/black-front.png");
        font = await j.loadFont('./cardassets/cardfont.fnt');
    } else {
        img = await jimp.read("./cardassets/white-front.png");
        font = await j.loadFont('./cardassets/cardfont-black.fnt');
    }

    let name = out.split("/")[1];
    if(fs.existsSync(`./input/${out.split("/")[1]}-icon.png`)) { //Replace the card's icon if it exists.
        img.composite(await jimp.read(`./cardassets/iconpatch-${type}.png`), 77, 571);
        img.composite(await jimp.read(`./input/${name}-icon.png`), 77, 571);
    }
    
    img.print({font, x: 80, y: 80, text: text, align: 'top-left', maxWidth: img.width-160});
    await img.write(out)
}


async function main() {
    fs.readdirSync("./input").forEach(file => {
        if(file.split(".")[1] != "csv") return;
        let outputFolder = file.split(".")[0];
        if(!fs.existsSync(`./output/${outputFolder}`)) {
            fs.mkdirSync(`./output/${outputFolder}`);
            let i = 0;
            let data = fs.readFileSync(`./input/${file}`).toString();
            let parsed = parse.parse(data, {columns: true, skip_empty_lines: true});
            parsed.forEach(card => {
                createCard(card.type, card.text, `output/${outputFolder}/card_${i}.png`);
                console.log(`Created card ${i}, type: ${card.type}, text: ${card.text}`);
                i++;
            });
            //console.log(data);
        } else {
            console.log(`./output/${outputFolder} already exists! Skipping...`);
            return;
        }
    })
    //createCard("white", "Test", `./output.png`);
}

main();