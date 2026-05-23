

const stripCorrectIndex = (questions) =>
  questions.map((q) => {
    const base = { 
      _id: q._id, 
      text: q.text, 
      type: q.type || 'mcq', 
      marks: q.marks, 
      description: q.description,
      isMultiSelect: q.isMultiSelect || false
    };
    if ((q.type || 'mcq') === 'mcq') base.options = q.options;
    return base;
  });


const  validateQuestions  = (questions) => {
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const type = q.type || 'mcq';

    if (!q.text || !q.text.trim()) return `Question ${i + 1}: text is required.`;

    if (type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length !== 4)
        return `Question ${i + 1}: MCQ must have exactly 4 options.`;
      if (q.options.some((o) => !o || !o.trim()))
        return `Question ${i + 1}: all 4 options must be filled.`;
      
      const hasCorrectOption = q.correctOption && typeof q.correctOption === 'string' && q.correctOption.trim();
      const hasCorrectOptions = Array.isArray(q.correctOptions) && q.correctOptions.length > 0;

      if (!hasCorrectOption && !hasCorrectOptions)
        return `Question ${i + 1}: a correct answer must be selected.`;

      if (hasCorrectOptions) {
        for (const opt of q.correctOptions) {
          if (!q.options.includes(opt)) {
            return `Question ${i + 1}: correct answer "${opt}" must match one of the options.`;
          }
        }
        if (q.correctOptions.length > 1) {
          q.isMultiSelect = true;
          q.correctOption = q.correctOptions[0];
        } else {
          q.isMultiSelect = q.isMultiSelect || false;
          q.correctOption = q.correctOptions[0];
        }
      } else {
        if (!q.options.includes(q.correctOption))
          return `Question ${i + 1}: correct answer must match one of the options.`;
        q.correctOptions = [q.correctOption];
        q.isMultiSelect = false;
      }
    }
  }
  return null;
};


const { sendExamNotifications } = require('./utils/mailer');

const autoUpdateStatus = async (exam) => {
  const now = new Date();
  let newStatus = exam.status;

  if (exam.status === 'draft') return exam;

  if (exam.status === 'scheduled' && exam.scheduledStart && now >= exam.scheduledStart)
    newStatus = 'live';

  if ((exam.status === 'live' || exam.status === 'scheduled') && exam.scheduledEnd && now >= exam.scheduledEnd)
    newStatus = 'ended';

  if (newStatus !== exam.status) {
    const oldStatus = exam.status;
    exam.status = newStatus;
    await exam.save();

    if (oldStatus === 'scheduled' && newStatus === 'live') {
      try {
        await exam.populate([
          { path: 'assignedStudents', select: 'name email' },
          { path: 'createdBy', select: 'name' }
        ]);
        await sendExamNotifications({
          exam,
          students: exam.assignedStudents,
          teacherName: exam.createdBy?.name || 'Your Teacher'
        });
      } catch (err) {
        console.error('[autoUpdateStatus] Failed to send live notifications:', err);
      }
    }
  }
  return exam;
};


module.exports = { stripCorrectIndex, validateQuestions, autoUpdateStatus };