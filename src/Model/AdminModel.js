import { sequelize } from './database.js';

const getAdminData = async (admin_id) => {
    try {
        const sql = `SELECT * FROM tb_admin where admin_id = :AdminId`;
        const adminData = await sequelize.query(sql, {
            replacements: { AdminId: admin_id },
            type: sequelize.QueryTypes.SELECT,
        });
        return adminData;
    } catch (error) {
        console.error("관리자 데이터 조회 오류:", error.message);
        return null;
    }
};

export { getAdminData };