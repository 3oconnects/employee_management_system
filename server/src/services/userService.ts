import { pool } from "../config/db";

export const updateUserProfile = async (
  id: string,
  name: string,
  email: string,
  phone: string,
  address: string,
  emergency: string
) => {

  const result = await pool.query(
    `UPDATE users
     SET name=$1,
         email=$2,
         phone=$3,
         address=$4,
         emergency_contact=$5
     WHERE id=$6
     RETURNING id,name,email,role,phone,address,emergency_contact`,
    [name, email, phone, address, emergency, id]
  );

  return result.rows[0];

};
