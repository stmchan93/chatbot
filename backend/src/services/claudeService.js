import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// System prompt for the chatbot
const SYSTEM_PROMPT = `You are a helpful medical scheduling assistant for HealthCare Plus Medical Center. Your role is to:

1. Answer questions about the clinic (hours, location, services)
2. Help patients find the right doctor based on their needs
3. Check doctor availability and schedule appointments
4. Modify or cancel existing appointments
5. Provide a friendly, professional experience

**Clinic Information:**
- Hours: Monday-Friday, 8:00 AM - 5:00 PM (Pacific Time)
- Appointment durations: 30 or 60 minutes only
- Appointment types: consultation, follow-up, emergency
- All times are in Pacific Standard Time (PST)

**Available Doctors:**
- Dr. Sarah Williams - Cardiologist (heart conditions)
- Dr. Michael Chen - Dermatologist (skin conditions)
- Dr. Emily Rodriguez - General Practitioner (general health)

**Important Guidelines:**
- Always confirm appointment details before scheduling
- Capture the reason for the visit in the conversation summary
- Be empathetic and professional
- If unsure about a medical issue, recommend they speak with a doctor
- Do not provide medical advice or diagnoses

When scheduling, always:
1. Ask about the reason for visit
2. Recommend appropriate doctor based on specialty
3. Check availability
4. Confirm time slot with patient
5. Create appointment with a clear summary`;

// Tool definitions for Claude
export const TOOLS = [
  {
    name: 'get_clinic_info',
    description: 'Get information about the clinic including hours, location, and contact details',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'list_doctors',
    description: 'Get a list of all available doctors with their specialties',
    input_schema: {
      type: 'object',
      properties: {
        specialty: {
          type: 'string',
          description: 'Optional: Filter doctors by specialty (e.g., Cardiologist, Dermatologist)'
        }
      },
      required: []
    }
  },
  {
    name: 'check_availability',
    description: 'Check available time slots for a specific doctor on a given date',
    input_schema: {
      type: 'object',
      properties: {
        doctor_id: {
          type: 'number',
          description: 'The ID of the doctor'
        },
        date: {
          type: 'string',
          description: 'Date in YYYY-MM-DD format'
        },
        duration: {
          type: 'number',
          description: 'Appointment duration in minutes (30 or 60)',
          enum: [30, 60]
        }
      },
      required: ['doctor_id', 'date', 'duration']
    }
  },
  {
    name: 'schedule_appointment',
    description: 'Schedule a new appointment for the patient',
    input_schema: {
      type: 'object',
      properties: {
        doctor_id: {
          type: 'number',
          description: 'The ID of the doctor'
        },
        start_time: {
          type: 'string',
          description: 'Start time in ISO 8601 format'
        },
        end_time: {
          type: 'string',
          description: 'End time in ISO 8601 format'
        },
        type: {
          type: 'string',
          description: 'Type of appointment',
          enum: ['consultation', 'follow-up', 'emergency']
        },
        summary: {
          type: 'string',
          description: 'Brief summary of the reason for visit and conversation context'
        }
      },
      required: ['doctor_id', 'start_time', 'end_time', 'type', 'summary']
    }
  },
  {
    name: 'cancel_appointment',
    description: 'Cancel an existing appointment',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'number',
          description: 'The ID of the appointment to cancel'
        }
      },
      required: ['appointment_id']
    }
  },
  {
    name: 'reschedule_appointment',
    description: 'Reschedule an existing appointment to a new time',
    input_schema: {
      type: 'object',
      properties: {
        appointment_id: {
          type: 'number',
          description: 'The ID of the appointment to reschedule'
        },
        start_time: {
          type: 'string',
          description: 'New start time in ISO 8601 format'
        },
        end_time: {
          type: 'string',
          description: 'New end time in ISO 8601 format'
        }
      },
      required: ['appointment_id', 'start_time', 'end_time']
    }
  },
  {
    name: 'get_patient_appointments',
    description: 'Get all appointments for the current patient',
    input_schema: {
      type: 'object',
      properties: {},
      required: []
    }
  }
];

/**
 * Send a message to Claude and get a response with tool calls
 * @param {Array} messages - Conversation history
 * @returns {Promise<Object>} Claude's response
 */
export async function sendMessage(messages) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages: messages
    });

    return response;
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

export { SYSTEM_PROMPT };
