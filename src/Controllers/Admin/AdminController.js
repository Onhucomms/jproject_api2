import { getAdminData } from '../../model/AdminModel.js';
import bcrypt from 'bcrypt';

const adminLogin = async (req, res) => {
    const { admin_id, admin_passwd } = req.body;

    if(!admin_id || !admin_passwd) {
        return res.status(400).json({ 
            response: 'error',
            mmessage: '아이디와 비밀번호를 입력해주세요.'
        });
    }

    const adminData = await getAdminData(admin_id);

    if(!adminData) {
        return res.status(400).json({ 
            response: 'error',
            mmessage: '아이디 또는 비밀번호가 올바르지 않습니다.'
        });
    }

    const isValidPassword = await bcrypt.compare(admin_passwd, adminData.admin_passwd);
    if(!isValidPassword) {
        return res.status(400).json({ 
            response: 'error',
            mmessage: '아이디 또는 비밀번호가 올바르지 않습니다.'
        });
    }

    const client_ip = req.ip;



    res.json({ message: 'Login successful' });

    if(admin_id === 'admin' && admin_password === 'admin') {
        res.json({ message: 'Login successful' });
    } else {
        res.json({ message: 'Login failed' });
    }
};

export { adminLogin };