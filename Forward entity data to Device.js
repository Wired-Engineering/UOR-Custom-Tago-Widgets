// Entity Data Widget Analysis - Fetches entity data and sends to device for widget display
import { Analysis, Resources } from '@tago-io/sdk';
import { gzipSync } from 'zlib';

const MAX_VALUE_SIZE = 5000; // 5kB to stay safely under 6kB limit
const CHUNK_SIZE = 4500; // Size for each chunk when splitting

// Entity configuration from environment variable
const ENTITY_ID = process.env.ENTITY_ID;
const DEVICE_ID = process.env.DEVICE_ID; // Device to send entity data to

/**
 * Ensures the entity data device exists and returns its ID
 */
async function ensureEntityDevice(context) {
  context.log('Checking for entity data device...');

  if (!DEVICE_ID) {
    throw new Error(
      'DEVICE_ID environment variable not set. Please configure your entity data device ID.',
    );
  }

  try {
    // Verify device exists
    const device = await Resources.devices.info(DEVICE_ID);
    context.log(`Using existing device: ${device.id} - ${device.name}`);
    return device.id;
  } catch (error) {
    context.log(
      'Device not found. Please create a device and set DEVICE_ID environment variable.',
    );
    throw new Error('Entity data device not configured');
  }
}

/**
 * Clears all existing entity data from the device
 */
async function clearAllEntityData(context, deviceID) {
  context.log('Clearing all existing entity data from device...');

  try {
    await Resources.devices.emptyDeviceData(deviceID);
    context.log('Successfully cleared all entity data from device');
  } catch (err) {
    context.log(`Error during data clearing: ${err.message}`);
    // Continue anyway - might be first run with no data
  }
}

/**
 * Compresses a string using gzip and returns base64 encoded result
 */
function compressToBase64(str) {
  const compressed = gzipSync(Buffer.from(str, 'utf-8'));
  return compressed.toString('base64');
}

/**
 * Formats entity data for Device storage
 * Uses gzip compression for large records, chunks if still too large
 */
function formatEntityDataForDevice(entityRecords, cameraDevices = []) {
  const deviceData = [];
  const currentTime = new Date();
  const groupId = `entity_${currentTime.toISOString().split('T')[0]}_${currentTime.getHours()}`;

  // Track time offset for unique timestamps
  let timeOffset = 0;

  // Send each entity record as a separate data point
  entityRecords.forEach((record, index) => {
    const jsonStr = JSON.stringify(record);
    const recordId = record.unique_id || record.id || `record_${index}`;

    // Check if record fits within limit as-is
    if (jsonStr.length <= MAX_VALUE_SIZE) {
      deviceData.push({
        variable: 'entity_record',
        value: jsonStr,
        time: new Date(currentTime.getTime() + timeOffset++),
        group: groupId,
        metadata: {
          record_type: record.record_type,
          unique_id: record.unique_id,
          name: record.name,
          park: record.info?.park || 'Unknown',
          index: index,
          encoding: 'json',
        },
      });
      return;
    }

    // Try gzip compression
    const compressed = compressToBase64(jsonStr);

    if (compressed.length <= MAX_VALUE_SIZE) {
      // Compressed fits in single record
      deviceData.push({
        variable: 'entity_record',
        value: compressed,
        time: new Date(currentTime.getTime() + timeOffset++),
        group: groupId,
        metadata: {
          record_type: record.record_type,
          unique_id: record.unique_id,
          name: record.name,
          park: record.info?.park || 'Unknown',
          index: index,
          encoding: 'gzip_base64',
        },
      });
      return;
    }

    // Still too large - chunk the compressed data
    const totalChunks = Math.ceil(compressed.length / CHUNK_SIZE);

    for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
      const chunkData = compressed.slice(
        chunkIdx * CHUNK_SIZE,
        (chunkIdx + 1) * CHUNK_SIZE,
      );

      deviceData.push({
        variable: 'entity_record_chunk',
        value: chunkData,
        time: new Date(currentTime.getTime() + timeOffset++),
        group: groupId,
        metadata: {
          record_type: record.record_type,
          unique_id: record.unique_id,
          name: record.name,
          park: record.info?.park || 'Unknown',
          index: index,
          encoding: 'gzip_base64_chunked',
          chunk_id: recordId,
          chunk_index: chunkIdx,
          total_chunks: totalChunks,
        },
      });
    }
  });

  // Send camera device records
  cameraDevices.forEach((camera, index) => {
    const jsonStr = JSON.stringify(camera);

    deviceData.push({
      variable: 'camera_device',
      value: jsonStr,
      time: new Date(currentTime.getTime() + timeOffset++),
      group: groupId,
      metadata: {
        device_id: camera.id,
        name: camera.name,
        hostname: camera.hostname,
        device_type: camera.device_type,
        park: camera.park,
        is_configured: camera.is_configured,
        index: index,
      },
    });
  });

  // Also send summary statistics as separate variables for quick access
  const stats = {
    camera_scenario: 0,
    queue_venue: 0,
    occupancy_venue: 0,
  };

  const parks = new Set();

  entityRecords.forEach((record) => {
    if (stats[record.record_type] !== undefined) {
      stats[record.record_type]++;
    }
    if (record.info?.park) {
      parks.add(record.info.park);
    }
  });

  // Camera device stats
  const configuredCameras = cameraDevices.filter((c) => c.is_configured).length;
  const unconfiguredCameras = cameraDevices.filter(
    (c) => !c.is_configured,
  ).length;

  // Add summary variables (use timeOffset to avoid timestamp collisions)
  deviceData.push({
    variable: 'total_records',
    value: entityRecords.length,
    time: new Date(currentTime.getTime() + timeOffset++),
    group: groupId,
  });

  deviceData.push({
    variable: 'camera_scenarios_count',
    value: stats.camera_scenario,
    time: new Date(currentTime.getTime() + timeOffset++),
    group: groupId,
  });

  deviceData.push({
    variable: 'queue_venues_count',
    value: stats.queue_venue,
    time: new Date(currentTime.getTime() + timeOffset++),
    group: groupId,
  });

  deviceData.push({
    variable: 'occupancy_venues_count',
    value: stats.occupancy_venue,
    time: new Date(currentTime.getTime() + timeOffset++),
    group: groupId,
  });

  deviceData.push({
    variable: 'camera_devices_count',
    value: cameraDevices.length,
    time: new Date(currentTime.getTime() + timeOffset++),
    group: groupId,
    metadata: {
      configured: configuredCameras,
      unconfigured: unconfiguredCameras,
    },
  });

  deviceData.push({
    variable: 'parks_count',
    value: parks.size,
    time: new Date(currentTime.getTime() + timeOffset++),
    group: groupId,
    metadata: {
      parks: Array.from(parks),
    },
  });

  // Add a marker to indicate data load is complete
  deviceData.push({
    variable: 'data_loaded',
    value: true,
    time: new Date(currentTime.getTime() + timeOffset++),
    group: groupId,
    metadata: {
      record_count: entityRecords.length,
      camera_devices_count: cameraDevices.length,
      last_update: currentTime.toISOString(),
    },
  });

  return deviceData;
}

/**
 * Updates entity data in the device (clear and reload approach)
 */
async function updateEntityDevice(
  context,
  deviceID,
  entityRecords,
  cameraDevices = [],
) {
  context.log('=== Starting entity device update (clear and reload) ===');

  try {
    // Clear all existing entity data
    await clearAllEntityData(context, deviceID);

    // Format data for Device storage
    const deviceFormattedData = formatEntityDataForDevice(
      entityRecords,
      cameraDevices,
    );
    context.log(
      `Formatted ${deviceFormattedData.length} data points for Device storage`,
    );

    // Send data to device in batches to avoid overwhelming the API
    if (deviceFormattedData.length > 0) {
      const batchSize = 100;
      let totalSent = 0;

      for (let i = 0; i < deviceFormattedData.length; i += batchSize) {
        const batch = deviceFormattedData.slice(i, i + batchSize);
        await Resources.devices.sendDeviceData(deviceID, batch);
        totalSent += batch.length;
        context.log(
          `Sent batch ${Math.floor(i / batchSize) + 1} with ${batch.length} records (${totalSent}/${deviceFormattedData.length})`,
        );
      }
      context.log(
        `Successfully sent ${deviceFormattedData.length} data points to entity device`,
      );
    } else {
      context.log('No valid data to send to entity device');
    }

    // Log summary
    context.log('\n=== Entity Data Summary ===');
    const stats = deviceFormattedData.find(
      (d) => d.variable === 'total_records',
    );
    const cameras = deviceFormattedData.find(
      (d) => d.variable === 'camera_scenarios_count',
    );
    const queues = deviceFormattedData.find(
      (d) => d.variable === 'queue_venues_count',
    );
    const occupancy = deviceFormattedData.find(
      (d) => d.variable === 'occupancy_venues_count',
    );
    const parks = deviceFormattedData.find((d) => d.variable === 'parks_count');

    context.log(`Total records: ${stats?.value || 0}`);
    context.log(`Camera scenarios: ${cameras?.value || 0}`);
    context.log(`Queue venues: ${queues?.value || 0}`);
    context.log(`Occupancy venues: ${occupancy?.value || 0}`);
    context.log(
      `Parks: ${parks?.value || 0} (${parks?.metadata?.parks?.join(', ') || 'none'})`,
    );

    return {
      deviceID: deviceID,
      recordsSent: deviceFormattedData.length,
      entityRecords: entityRecords.length,
    };
  } catch (error) {
    context.log(`Error in updateEntityDevice: ${error.message}`);
    if (error.stack) context.log(`Stack trace: ${error.stack}`);
    throw error;
  } finally {
    context.log('=== Completed entity device update ===');
  }
}

/**
 * Fetches devices by device_type tag value with pagination
 */
async function fetchDevicesByType(context, deviceType) {
  const devices = [];
  let page = 1;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    const filter = {
      tags: [{ key: 'device_type', value: deviceType }],
    };

    const result = await Resources.devices.list({
      page,
      fields: ['id', 'name', 'tags', 'last_input', 'created_at', 'updated_at'],
      filter,
      amount: pageSize,
      orderBy: ['name', 'asc'],
    });

    devices.push(...result);
    hasMore = result.length === pageSize;
    page++;

    if (page > 20) {
      context.log(`Warning: Reached page limit for device_type=${deviceType}`);
      break;
    }
  }

  return devices;
}

/**
 * Fetches camera devices from TagoIO by device_type tag
 * Returns devices tagged as axis-camera, hanwha-camera, or camera
 */
async function fetchCameraDevices(context) {
  context.log('Fetching camera devices...');

  const CAMERA_DEVICE_TYPES = ['axis-camera', 'hanwha-camera', 'camera'];

  // Fetch each device type in parallel
  const devicesByType = await Promise.all(
    CAMERA_DEVICE_TYPES.map((type) => fetchDevicesByType(context, type)),
  );

  // Flatten and deduplicate by ID
  const allDevices = devicesByType.flat();
  const uniqueDevices = [...new Map(allDevices.map((d) => [d.id, d])).values()];

  context.log(
    `Found ${uniqueDevices.length} camera devices (${CAMERA_DEVICE_TYPES.map((t, i) => `${t}: ${devicesByType[i].length}`).join(', ')})`,
  );

  // Transform to a simpler structure for the widget
  return uniqueDevices.map((device) => {
    const tags = {};
    if (device.tags) {
      device.tags.forEach((tag) => {
        tags[tag.key] = tag.value;
      });
    }

    return {
      id: device.id,
      name: device.name,
      device_type: tags.device_type || 'unknown',
      hostname: tags.hostname || tags.camera_hostname || null,
      park: tags.park || null,
      location: tags.location || null,
      ip_address: tags.ip_address || null,
      tags: tags,
      last_input: device.last_input,
      created_at: device.created_at,
      updated_at: device.updated_at,
      is_configured: tags.device_type !== 'camera', // 'camera' means unconfigured
    };
  });
}

/**
 * Main analysis function
 */
async function showEntityData(context) {
  context.log('=== Starting Entity Data Widget Analysis ===');

  try {
    // Verify entity ID is configured
    if (!ENTITY_ID) {
      context.log('ERROR: ENTITY_ID environment variable not configured');
      return;
    }

    // Ensure device exists
    const deviceID = await ensureEntityDevice(context);

    // Fetch entity data
    context.log(`Fetching entity data from entity: ${ENTITY_ID}`);
    const entityResult = await Resources.entities.getEntityData(ENTITY_ID, {
      amount: 200,
    });

    context.log(`Retrieved ${entityResult.length} entity records`);

    // Fetch camera devices
    const cameraDevices = await fetchCameraDevices(context);

    // Log camera device summary
    const configuredCameras = cameraDevices.filter((c) => c.is_configured);
    const unconfiguredCameras = cameraDevices.filter((c) => !c.is_configured);
    context.log(
      `Camera devices: ${configuredCameras.length} configured, ${unconfiguredCameras.length} unconfigured`,
    );

    // Create hostname to device ID lookup for matching scenarios to devices
    const hostnameToDeviceId = new Map();
    cameraDevices.forEach((camera) => {
      if (camera.hostname) {
        hostnameToDeviceId.set(camera.hostname.toLowerCase(), camera.id);
      }
    });

    // Enrich camera scenarios with their device IDs
    let scenariosEnriched = 0;
    entityResult.forEach((record) => {
      if (record.record_type === 'camera_scenario' && record.info?.camera_hostname) {
        const deviceId = hostnameToDeviceId.get(record.info.camera_hostname.toLowerCase());
        if (deviceId) {
          record.info.camera_device_id = deviceId;
          scenariosEnriched++;
        }
      }
    });
    context.log(`Enriched ${scenariosEnriched} camera scenarios with device IDs`);

    // Update the entity device with fresh data (including camera devices)
    const result = await updateEntityDevice(
      context,
      deviceID,
      entityResult,
      cameraDevices,
    );

    context.log(`Entity device update completed:`);
    context.log(`  - Sent ${result.recordsSent} data points`);
    context.log(`  - Entity records: ${result.entityRecords}`);
    context.log(`  - Camera devices: ${cameraDevices.length}`);
    context.log(`  - Device ID: ${result.deviceID}`);

    context.log('Analysis completed successfully');
  } catch (error) {
    context.log(`Error in Entity Data Widget Analysis: ${error.message}`);
    if (error.stack) context.log(`Stack trace: ${error.stack}`);
    throw error;
  } finally {
    context.log('=== Completed Entity Data Widget Analysis ===');
  }
}

// Export the analysis function with the required token
export default Analysis.use(showEntityData, {
  token: process.env.ANALYSIS_TOKEN,
});
