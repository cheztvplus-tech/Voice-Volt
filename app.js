// Voice Volt - Complete Voice Cloning Application

// ==================== CONFIGURATION ====================
const CONFIG = {
    services: {
        minimax: {
            name: 'MiniMax',
            uploadUrl: 'https://api.minimax.chat/v1/files/upload',
            ttsUrl: 'https://api.minimax.chat/v1/t2a_v2',
            voiceCloneUrl: 'https://api.minimax.chat/v1/voice_clone',
        },
        elevenlabs: {
            name: 'ElevenLabs',
            baseUrl: 'https://api.elevenlabs.io/v1',
        }
    }
};

// ==================== STATE ====================
const state = {
    currentService: 'minimax',
    apiKey: '',
    samples: [null, null, null],
    currentRecordingIndex: null,
    mediaRecorder: null,
    audioChunks: [],
    recordingStartTime: null,
    recordingTimer: null,
    voiceId: null,
    isRecording: false,
    audioContext: null
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Voice Volt initializing...');
    
    // Check for saved voice
    const savedVoiceId = localStorage.getItem('voiceVoltVoiceId');
    const savedService = localStorage.getItem('voiceVoltService');
    
    if (savedVoiceId && savedService) {
        state.voiceId = savedVoiceId;
        state.currentService = savedService;
        showVoiceReady(savedVoiceId);
    }
    
    // Setup all event listeners
    setupEventListeners();
});

function setupEventListeners() {
    // Service selection
    document.querySelectorAll('.radio-option').forEach(el => {
        el.addEventListener('click', (e) => {
            const service = el.dataset.service;
            selectService(service, el);
        });
    });
    
    // Record buttons
    document.querySelectorAll('.sample-item button').forEach((btn, index) => {
        btn.addEventListener('click', () => recordSample(index));
    });
    
    // Main record button
    document.getElementById('recordBtn').addEventListener('click', toggleRecording);
    
    // Create voice button
    document.getElementById('createVoiceBtn').addEventListener('click', createVoiceClone);
    
    // Mode tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const mode = e.target.dataset.mode;
            switchMode(mode);
        });
    });
    
    // Speak button
    const speakBtn = document.getElementById('speakBtn');
    if (speakBtn) {
        speakBtn.addEventListener('click', speakWithClone);
    }
    
    // Speed slider
    const speedSlider = document.getElementById('speed');
    if (speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            document.getElementById('speedValue').textContent = e.target.value;
        });
    }
    
    // Duration slider
    const durationSlider = document.getElementById('noteDuration');
    if (durationSlider) {
        durationSlider.addEventListener('input', (e) => {
            document.getElementById('durationValue').textContent = e.target.value;
        });
    }
    
    console.log('Event listeners setup complete');
}

// ==================== SERVICE SELECTION ====================
function selectService(service, element) {
    console.log('Selecting service:', service);
    state.currentService = service;
    
    // Update UI
    document.querySelectorAll('.radio-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    
    const serviceNames = { minimax: 'MiniMax', elevenlabs: 'ElevenLabs' };
    document.getElementById('serviceName').textContent = `(${serviceNames[service]})`;
}

// ==================== VOICE CALIBRATION ====================
function recordSample(index) {
    console.log('Recording sample:', index);
    state.currentRecordingIndex = index;
    const texts = [
        "The quick brown fox jumps over the lazy dog.",
        "Hello, this is my voice being calibrated for cloning.",
        "I can read books, sing songs, and speak in my own cloned voice."
    ];
    
    document.getElementById('recordingText').textContent = texts[index];
    document.getElementById('recordingInterface').classList.remove('hidden');
    document.getElementById('recordingTimer').textContent = '00:00';
    
    document.getElementById('recordingInterface').scrollIntoView({ behavior: 'smooth' });
}

async function toggleRecording() {
    console.log('Toggle recording, current state:', state.isRecording);
    const btn = document.getElementById('recordBtn');
    const box = document.querySelector('.calibration-box');
    
    if (state.isRecording) {
        stopRecording();
    } else {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    sampleRate: 44100,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true
                } 
            });
            
            state.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            state.audioChunks = [];
            
            state.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) state.audioChunks.push(e.data);
            };
            
            state.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
                saveSample(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            state.mediaRecorder.start();
            state.isRecording = true;
            state.recordingStartTime = Date.now();
            
            btn.textContent = '⏹️ Stop Recording';
            btn.classList.add('recording');
            box.classList.add('recording');
            
            state.recordingTimer = setInterval(updateRecordingTimer, 1000);
            
        } catch (err) {
            console.error('Mic error:', err);
            showStatus('calibrationStatus', 'Error accessing microphone: ' + err.message, 'error');
        }
    }
}

function updateRecordingTimer() {
    const elapsed = Math.floor((Date.now() - state.recordingStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('recordingTimer').textContent = `${mins}:${secs}`;
}

function stopRecording() {
    if (state.mediaRecorder && state.isRecording) {
        state.mediaRecorder.stop();
        state.isRecording = false;
        clearInterval(state.recordingTimer);
        
        const btn = document.getElementById('recordBtn');
        btn.textContent = 'Start Recording';
        btn.classList.remove('recording');
        document.querySelector('.calibration-box').classList.remove('recording');
    }
}

function saveSample(audioBlob) {
    const index = state.currentRecordingIndex;
    state.samples[index] = audioBlob;
    
    const items = document.querySelectorAll('.sample-item');
    items[index].classList.add('recorded');
    items[index].querySelector('button').textContent = 'Re-record';
    
    const url = URL.createObjectURL(audioBlob);
    const audio = document.createElement('audio');
    audio.src = url;
    audio.controls = true;
    audio.style.width = '100%';
    audio.style.marginTop = '10px';
    
    const existingAudio = items[index].querySelector('audio');
    if (existingAudio) existingAudio.remove();
    
    items[index].appendChild(audio);
    
    const recordedCount = state.samples.filter(s => s !== null).length;
    const progress = (recordedCount / 3) * 100;
    document.getElementById('calibrationProgress').style.width = `${progress}%`;
    
    if (recordedCount === 3) {
        document.getElementById('createVoiceBtn').disabled = false;
        showStatus('calibrationStatus', 'All samples recorded! Ready to create your voice clone.', 'success');
    } else {
        showStatus('calibrationStatus', `Sample ${index + 1} recorded. Record ${3 - recordedCount} more.`, 'info');
    }
    
    document.getElementById('recordingInterface').classList.add('hidden');
}

// ==================== VOICE CLONING ====================
async function createVoiceClone() {
    console.log('Creating voice clone with service:', state.currentService);
    const apiKey = document.getElementById('apiKey').value.trim();
    if (!apiKey) {
        showStatus('calibrationStatus', 'Please enter your API key', 'error');
        return;
    }
    
    state.apiKey = apiKey;
    
    // Verify service selection is working
    console.log('Selected service:', state.currentService);
    console.log('API Key (first 10 chars):', apiKey.substring(0, 10) + '...');
    
    document.getElementById('calibrationSection').classList.add('hidden');
    document.getElementById('processingSection').classList.remove('hidden');
    updateStep(2);
    
    try {
        let voiceId;
        
        if (state.currentService === 'minimax') {
            console.log('Using MiniMax API...');
            voiceId = await createMiniMaxVoice();
        } else if (state.currentService === 'elevenlabs') {
            console.log('Using ElevenLabs API...');
            voiceId = await createElevenLabsVoice();
        } else {
            throw new Error('Unknown service: ' + state.currentService);
        }
        
        state.voiceId = voiceId;
        localStorage.setItem('voiceVoltVoiceId', voiceId);
        localStorage.setItem('voiceVoltService', state.currentService);
        
        setTimeout(() => {
            document.getElementById('processingSection').classList.add('hidden');
            showVoiceReady(voiceId);
        }, 2000);
        
    } catch (err) {
        console.error('Cloning failed:', err);
        document.getElementById('processingSection').classList.add('hidden');
        document.getElementById('calibrationSection').classList.remove('hidden');
        showStatus('calibrationStatus', 'Failed: ' + err.message, 'error');
        updateStep(1);
    }
}

async function createMiniMaxVoice() {
    console.log('Creating MiniMax voice...');
    
    // Step 1: Upload audio files to MiniMax
    const fileIds = [];
    
    for (let i = 0; i < state.samples.length; i++) {
        const formData = new FormData();
        formData.append('file', state.samples[i], `sample_${i}.wav`);
        
        console.log(`Uploading sample ${i+1}...`);
        
        const uploadResponse = await fetch('https://api.minimax.chat/v1/files/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${state.apiKey}`
            },
            body: formData
        });
        
        if (!uploadResponse.ok) {
            const error = await uploadResponse.text();
            throw new Error(`Upload failed for sample ${i+1}: ${error}`);
        }
        
        const uploadData = await uploadResponse.json();
        console.log(`Sample ${i+1} uploaded:`, uploadData);
        
        // MiniMax returns file_id in the response
        if (uploadData.file_id) {
            fileIds.push(uploadData.file_id);
        } else if (uploadData.id) {
            fileIds.push(uploadData.id);
        } else {
            throw new Error('Unexpected upload response: ' + JSON.stringify(uploadData));
        }
    }
    
    // Step 2: Create voice clone using the uploaded files
    console.log('Creating voice clone with files:', fileIds);
    
    const cloneResponse = await fetch('https://api.minimax.chat/v1/voice_clone', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
            voice_name: 'VoiceVolt_' + Date.now(),
            file_ids: fileIds,
            // Optional parameters
            description: 'Cloned voice for Voice Volt app'
        })
    });
    
    if (!cloneResponse.ok) {
        const error = await cloneResponse.text();
        throw new Error(`Voice clone failed: ${error}`);
    }
    
    const cloneData = await cloneResponse.json();
    console.log('Voice clone created:', cloneData);
    
    // Return the voice_id
    if (cloneData.voice_id) {
        return cloneData.voice_id;
    } else if (cloneData.id) {
        return cloneData.id;
    } else {
        throw new Error('Unexpected clone response: ' + JSON.stringify(cloneData));
    }
}

// ==================== USE CLONED VOICE ====================
function showVoiceReady(voiceId) {
    document.getElementById('useVoiceSection').classList.remove('hidden');
    document.getElementById('voiceIdDisplay').textContent = voiceId.substring(0, 8) + '...';
    updateStep(3);
    document.getElementById('calibrationSection').classList.add('hidden');
}

function switchMode(mode) {
    console.log('Switching mode:', mode);
    document.querySelectorAll('.mode-tab').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
    
    if (mode === 'read') {
        document.getElementById('readMode').classList.remove('hidden');
        document.getElementById('singMode').classList.add('hidden');
    } else {
        document.getElementById('readMode').classList.add('hidden');
        document.getElementById('singMode').classList.remove('hidden');
    }
}

// ==================== SPEAK WITH CLONE ====================
async function speakWithClone() {
    console.log('Speaking with clone...');
    const text = document.getElementById('readText').value;
    if (!text || !state.voiceId) return;
    
    const btn = document.getElementById('speakBtn');
    btn.disabled = true;
    btn.textContent = 'Generating...';
    
    try {
        const audioUrl = await generateSpeech(text, {
            speed: parseFloat(document.getElementById('speed').value),
            emotion: document.getElementById('emotion').value
        });
        
        playAudio(audioUrl);
        showPlaybackStatus('Playing your cloned voice!', 'success');
        
    } catch (err) {
        showPlaybackStatus('Error: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🔊 Read with My Voice';
    }
}

async function generateSpeech(text, options = {}) {
    console.log('Generating speech with:', state.currentService);
    
    if (state.currentService === 'minimax') {
        return generateMiniMaxSpeech(text, options);
    } else if (state.currentService === 'elevenlabs') {
        return generateElevenLabsSpeech(text, options);
    } else {
        throw new Error('Unknown service for TTS: ' + state.currentService);
    }
}

async function generateElevenLabsSpeech(text, options) {
    const voiceSettings = {
        stability: 0.5,
        similarity_boost: 0.75,
        style: options.emotion === 'excited' ? 0.5 : 0,
        use_speaker_boost: true
    };
    
    const response = await fetch(
        `${CONFIG.services.elevenlabs.baseUrl}/text-to-speech/${state.voiceId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'xi-api-key': state.apiKey
        },
        body: JSON.stringify({
            text: text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: voiceSettings
        })
    });
    
    if (!response.ok) throw new Error('TTS generation failed');
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

async function generateMiniMaxSpeech(text, options) {
    console.log('MiniMax TTS:', text.substring(0, 50) + '...');
    
    const response = await fetch('https://api.minimax.chat/v1/t2a_v2', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${state.apiKey}`
        },
        body: JSON.stringify({
            model: 'speech-01-turbo',
            text: text,
            voice_id: state.voiceId,
            speed: options.speed || 1.0,
            // MiniMax uses different emotion mapping
            emotion: mapEmotionToMiniMax(options.emotion),
            audio_format: 'mp3'
        })
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`MiniMax TTS failed: ${error}`);
    }
    
    const data = await response.json();
    console.log('MiniMax TTS response:', data);
    
    // MiniMax returns audio in data.audio_data (base64) or data.audio_url
    if (data.audio_data) {
        const blob = base64ToBlob(data.audio_data, 'audio/mp3');
        return URL.createObjectURL(blob);
    } else if (data.audio_url) {
        return data.audio_url;
    } else {
        throw new Error('Unexpected TTS response: ' + JSON.stringify(data));
    }
}

function mapEmotionToMiniMax(emotion) {
    // Map our emotions to MiniMax format
    const mapping = {
        'neutral': 'neutral',
        'happy': 'happy',
        'sad': 'sad',
        'angry': 'angry',
        'excited': 'excited'
    };
    return mapping[emotion] || 'neutral';
}

function base64ToBlob(base64, type) {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
    }
    return new Blob([array], { type: type });
}

// ==================== SINGING ====================
async function singNote(note) {
    console.log('Singing note:', note);
    const noteNames = { 'C4': 'Do', 'D4': 'Re', 'E4': 'Mi', 'F4': 'Fa', 'G4': 'Sol', 'A4': 'La', 'B4': 'Si', 'C5': 'Do' };
    document.getElementById('currentNote').textContent = noteNames[note] || note;
    
    const text = document.getElementById('singText').value || 'La';
    
    try {
        const audioUrl = await generateSpeech(text, { speed: 0.8 });
        const pitchMultiplier = getPitchMultiplier(note);
        await playWithPitchShift(audioUrl, pitchMultiplier);
    } catch (err) {
        showPlaybackStatus('Singing error: ' + err.message, 'error');
    }
}

async function singScale() {
    const notes = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];
    document.getElementById('currentNote').textContent = '🎹';
    
    for (const note of notes) {
        await singNote(note);
        await sleep(600);
    }
}

function getPitchMultiplier(note) {
    const noteFreqs = {
        'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23,
        'G4': 392.00, 'A4': 440.00, 'B4': 493.88, 'C5': 523.25
    };
    const targetFreq = noteFreqs[note] || 440;
    return targetFreq / 440.0;
}

async function playWithPitchShift(audioUrl, pitchMultiplier) {
    const audio = new Audio(audioUrl);
    audio.playbackRate = pitchMultiplier;
    audio.play();
}

// ==================== UTILITIES ====================
function updateStep(stepNum) {
    document.querySelectorAll('.step').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx + 1 < stepNum) el.classList.add('completed');
        else if (idx + 1 === stepNum) el.classList.add('active');
    });
}

function showStatus(elementId, message, type) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.className = type === 'success' ? 'success-msg' : type === 'error' ? 'error-msg' : 'warning';
    el.textContent = message;
    el.classList.remove('hidden');
}

function showPlaybackStatus(message, type) {
    const el = document.getElementById('playbackStatus');
    if (!el) return;
    el.className = type === 'success' ? 'success-msg' : 'error-msg';
    el.textContent = message;
}

function playAudio(url) {
    const audio = new Audio(url);
    audio.play();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== SERVICE WORKER ====================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(console.error);
}
