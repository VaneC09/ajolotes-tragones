const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'ajolote_user',
  password: process.env.DB_PASSWORD || 'ajolote_pass',
  database: process.env.DB_NAME || 'ajolotedb',
  port: process.env.DB_PORT || 5432,
});

// Respaldo local en memoria si no hay base de datos conectada
let localTop10 = [
  { player_name: 'AjoloteRey', score: 50 },
  { player_name: 'AxolotlMx', score: 30 }
];

const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS top_scores (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(50) NOT NULL,
        score INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('📄 Tabla top_scores lista en PostgreSQL.');
  } catch (err) {
    console.log('⚠️ Sin conexión a PostgreSQL: Usando Top 10 en memoria local.');
  }
};

initDb();

module.exports = {
  getTop10: async () => {
    try {
      const res = await pool.query('SELECT player_name, score FROM top_scores ORDER BY score DESC LIMIT 10');
      return res.rows.length > 0 ? res.rows : localTop10;
    } catch {
      return localTop10.sort((a, b) => b.score - a.score).slice(0, 10);
    }
  },
  saveScore: async (name, score) => {
    if (score <= 0) return;
    try {
      await pool.query('INSERT INTO top_scores (player_name, score) VALUES ($1, $2)', [name, score]);
    } catch (err) {
      // Guardar en memoria local
      localTop10.push({ player_name: name, score: score });
      localTop10.sort((a, b) => b.score - a.score);
      localTop10 = localTop10.slice(0, 10);
    }
  }
};