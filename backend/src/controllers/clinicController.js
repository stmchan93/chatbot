import { getMongoDb } from '../config/database.js';

export async function getClinicInfo(req, res) {
  try {
    const mongodb = getMongoDb();
    const clinicInfo = await mongodb.collection('clinic_info').findOne({});

    if (!clinicInfo) {
      return res.status(404).json({ error: 'Clinic information not found' });
    }

    // Remove MongoDB _id from response
    const { _id, ...clinicData } = clinicInfo;

    res.json(clinicData);
  } catch (error) {
    console.error('Get clinic info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
