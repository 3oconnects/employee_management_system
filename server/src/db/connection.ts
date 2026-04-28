import { pool, query, directPool } from '../config/db';

export const migrationQuery = (text: string, params?: any[]) => directPool.query(text, params);

export { pool, query, directPool };
export default { pool, query, directPool, migrationQuery };
