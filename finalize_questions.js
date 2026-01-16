const fs = require('fs');

const techFile = 'c:/Users/eguit/OneDrive/ドキュメント/学校用/二年後期/07_キャリアデザイン/課題/questions_technology.js';
const mgmtFile = 'c:/Users/eguit/OneDrive/ドキュメント/学校用/二年後期/07_キャリアデザイン/課題/questions_management.js';
const stratFile = 'c:/Users/eguit/OneDrive/ドキュメント/学校用/二年後期/07_キャリアデザイン/課題/questions_strategy.js';

function readQuestions(filePath, varName) {
    const content = fs.readFileSync(filePath, 'utf8');
    // Basic extraction of the array content
    const start = content.indexOf('[');
    const end = content.lastIndexOf(']');
    const jsonStr = content.substring(start, end + 1);
    // Note: This assumes the JS file is valid JSON inside the array markers, 
    // but our files have trailing commas and potentially single quotes if I wasn't careful.
    // Actually, I used double quotes. Let's try to parse it.
    // Since it's a JS file, we can eval it in a controlled way or just use a regex/parser.
    // For simplicity, let's use a small trick: 
    // Remove the variable declaration and semicolon, then parse.
    try {
        // Remove 'const VAR = ' and ';'
        let clean = content.replace(/const\s+\w+\s*=\s*/, '').replace(/;\s*$/, '');
        // Standardize trailing commas for JSON.parse (JSON doesn't allow them)
        // But our content might have them. Let's use eval for JS-compatibility.
        return eval(content.replace(/const\s+\w+\s*=\s*/, ''));
    } catch (e) {
        console.error(`Error parsing ${filePath}:`, e);
        return [];
    }
}

const tech = readQuestions(techFile, 'TECH_QUESTIONS');
const mgmt = readQuestions(mgmtFile, 'MGMT_QUESTIONS');
const strat = readQuestions(stratFile, 'STRAT_QUESTIONS');

console.log(`Tech: ${tech.length}`);
console.log(`Mgmt: ${mgmt.length}`);
console.log(`Strat: ${strat.length}`);
console.log(`Total: ${tech.length + mgmt.length + strat.length}`);

// Combine and re-index
const allQuestions = [...tech, ...mgmt, ...strat]
    .filter(q => q.year && q.year.startsWith('令和'));

console.log(`Remaining questions (Reiwa only): ${allQuestions.length}`);

// Optional: Sort by category, then year?
// Actually, let's keep the order: Tech first, then Mgmt, then Strat.
// This matches index.html's ... operator order.

allQuestions.forEach((q, index) => {
    q.id = index + 1;
});

// Split back
const newTech = allQuestions.filter(q => q.category === 'テクノロジ');
const newMgmt = allQuestions.filter(q => q.category === 'マネジメント');
const newStrat = allQuestions.filter(q => q.category === 'ストラテジ');

function writeQuestions(filePath, varName, questions) {
    const content = `const ${varName} = ${JSON.stringify(questions, null, 4)};\n`;
    fs.writeFileSync(filePath, content, 'utf8');
}

writeQuestions(techFile, 'TECH_QUESTIONS', newTech);
writeQuestions(mgmtFile, 'MGMT_QUESTIONS', newMgmt);
writeQuestions(stratFile, 'STRAT_QUESTIONS', newStrat);

console.log('Re-indexing complete.');
