import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);

// Get Claude configuration
router.get('/', async (req, res) => {
  try {
    const { stdout } = await execAsync('claude config list');
    const config = JSON.parse(stdout);
    res.json(config);
  } catch (error) {
    console.error('Error getting Claude config:', error);
    res.status(500).json({ error: 'Failed to get Claude configuration' });
  }
});

// Get specific config value
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { stdout } = await execAsync(`claude config get "${key}"`);
    res.json({ key, value: stdout.trim() });
  } catch (error) {
    console.error('Error getting Claude config key:', error);
    res.status(500).json({ error: `Failed to get config key: ${req.params.key}` });
  }
});

// Set config value
router.post('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, global = false } = req.body;
    
    const globalFlag = global ? '-g' : '';
    const command = `claude config set ${globalFlag} "${key}" "${value}"`;
    
    await execAsync(command);
    res.json({ success: true, key, value });
  } catch (error) {
    console.error('Error setting Claude config:', error);
    res.status(500).json({ error: `Failed to set config key: ${req.params.key}` });
  }
});

// Add to config array
router.post('/:key/add', async (req, res) => {
  try {
    const { key } = req.params;
    const { values, global = false } = req.body;
    
    const globalFlag = global ? '-g' : '';
    const valuesStr = Array.isArray(values) ? values.join(' ') : values;
    const command = `claude config add ${globalFlag} "${key}" ${valuesStr}`;
    
    await execAsync(command);
    res.json({ success: true, key, added: values });
  } catch (error) {
    console.error('Error adding to Claude config array:', error);
    res.status(500).json({ error: `Failed to add to config array: ${req.params.key}` });
  }
});

// Remove from config
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { values, global = false } = req.body;
    
    const globalFlag = global ? '-g' : '';
    const valuesStr = values ? (Array.isArray(values) ? values.join(' ') : values) : '';
    const command = `claude config remove ${globalFlag} "${key}" ${valuesStr}`.trim();
    
    await execAsync(command);
    res.json({ success: true, key, removed: values });
  } catch (error) {
    console.error('Error removing Claude config:', error);
    res.status(500).json({ error: `Failed to remove config: ${req.params.key}` });
  }
});

export default router; 