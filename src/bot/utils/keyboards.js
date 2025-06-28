export const mainKeyboard = () => {
  return {
    reply_markup: {
      keyboard: [
        [{ text: 'View My Tasks' }],
        [{ text: 'Update Task Status' }],
        [{ text: 'Help' }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };
};

export const taskKeyboard = (taskId) => {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Complete Task', callback_data: `complete_${taskId}` },
          { text: 'Delete Task', callback_data: `delete_${taskId}` }
        ],
        [{ text: 'Back to Tasks', callback_data: 'back_to_tasks' }]
      ]
    }
  };
};