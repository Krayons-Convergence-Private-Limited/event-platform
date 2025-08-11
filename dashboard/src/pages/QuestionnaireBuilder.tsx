import React, { useState, useEffect } from "react";
import { PageTransition } from "@/components/ui/page-transition";
import { GradientButton } from "@/components/ui/gradient-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, ArrowRight, Plus, Trash2, HelpCircle, CheckSquare, Type, Tag, Star, ToggleLeft, Phone, Mail, ListCollapse, Users, Building, Columns, Square, Edit3, X } from "lucide-react";
import { Question, FormRow } from "@/types/event";
import { saveEventQuestions } from "@/lib/questions";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";

interface QuestionnaireBuilderProps {
  onBack: () => void;
  onNext: (questions: Question[]) => void;
  eventId: string;
}

interface QuestionPanel {
  id: string;
  title: string;
  questions: Question[];
}

interface DraggedItem {
  type: 'question' | 'panel';
  data: Question | QuestionPanel;
}

export const QuestionnaireBuilder = ({ onBack, onNext, eventId }: QuestionnaireBuilderProps) => {
  const { user } = useAuth();
  const [formPages, setFormPages] = useState<Question[][][]>([[]]); // Pages of rows of columns
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [dragPosition, setDragPosition] = useState<{ rowIndex: number; columnIndex: number; position: 'left' | 'right' | 'center' } | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const currentRows = formPages[currentPageIndex] || [];
  const currentQuestions = currentRows.flat().flat(); // Flatten rows and columns to get all questions

  // Handle form value changes
  const handleValueChange = (questionId: string, value: any) => {
    setFormValues(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // Predefined question templates
  const questionBank: Question[] = [
    { id: 'exhibition-dropdown', type: 'dropdown', question: 'Interested to visit exhibition', required: true, options: ['-- Select Exhibition --', 'Automation Expo 2025 Mumbai'] },
    { id: 'visitor-type', type: 'dropdown', question: 'Are you Visitor / Student?', required: true, options: ['-- Select --', 'VISITOR', 'STUDENT'] },
    { id: 'name', type: 'text', question: 'Name', required: true, placeholder: 'Enter your full name' },
    { id: 'designation', type: 'text', question: 'Designation', required: true, placeholder: 'Your job title' },
    { id: 'company', type: 'text', question: 'Company Name', required: true, placeholder: 'Company/Organization' },
    { id: 'city', type: 'text', question: 'City', required: true, placeholder: 'Your city' },
    { id: 'mobile', type: 'tel', question: 'Mobile', required: true, placeholder: 'Mobile number' },
    { id: 'email', type: 'email', question: 'Email', required: true, placeholder: 'your@email.com' },
    { id: 'address', type: 'text', question: 'Address', required: false, placeholder: 'Full address' },
    { id: 'state', type: 'text', question: 'State', required: false, placeholder: 'State/Province' },
    { id: 'country', type: 'dropdown', question: 'Country', required: false, options: ['India', 'United States', 'United Kingdom', 'Canada', 'Australia'] },
    { id: 'manufacturers', type: 'checkbox_group', question: '1. Manufacturers/ Dealers/ Representatives of:', required: true, options: ['Factory Automation', 'Process Automation', 'Instrumentation', 'Robotics', 'Valves'] },
    { id: 'industries', type: 'checkbox_group', question: '2. I belong to the following industries', required: true, options: ['Aerospace', 'Automotive', 'Chemicals', 'Healthcare', 'Manufacturing'] },
    { id: 'job-function', type: 'dropdown', question: '3. Your primary job function:', required: true, options: ['-- Select --', 'Management', 'Purchase', 'Research & development', 'Engineering', 'Maintenance'] }
  ];

  const questionPanels: QuestionPanel[] = [
    {
      id: 'visitor-info',
      title: 'Visitor/Student Information',
      questions: questionBank.slice(0, 11) // First 11 questions
    },
    {
      id: 'additional-details',
      title: 'Additional Details',
      questions: questionBank.slice(11) // Remaining questions
    }
  ];

  const questionTypes = [
    { value: 'text', label: 'Text Input', icon: Type, description: 'Single line text' },
    { value: 'textarea', label: 'Long Text', icon: Type, description: 'Multi-line text' },
    { value: 'dropdown', label: 'Dropdown', icon: ListCollapse, description: 'Select from dropdown' },
    { value: 'multiple-choice', label: 'Multiple Choice', icon: CheckSquare, description: 'Radio buttons' },
    { value: 'checkbox_group', label: 'Checkbox Group', icon: CheckSquare, description: 'Multiple selections' },
    { value: 'email', label: 'Email', icon: Mail, description: 'Email input' },
    { value: 'tel', label: 'Phone', icon: Phone, description: 'Phone number' },
    { value: 'tags', label: 'Tags', icon: Tag, description: 'Multiple selectable tags' },
    { value: 'rating', label: 'Rating', icon: Star, description: 'Star or number rating' },
    { value: 'boolean', label: 'Yes/No', icon: ToggleLeft, description: 'Simple toggle' }
  ];

  const handleDragStart = (e: React.DragEvent, item: DraggedItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent, rowIndex?: number, columnIndex?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    
    // Calculate drop position based on mouse position
    if (rowIndex !== undefined && columnIndex !== undefined) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;
      
      let position: 'left' | 'right' | 'center' = 'center';
      if (x < width * 0.25) {
        position = 'left';
      } else if (x > width * 0.75) {
        position = 'right';
      }
      
      setDragPosition({ rowIndex, columnIndex, position });
    }
  };

  const handleDragLeave = () => {
    setDragPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetRowIndex?: number, targetColumnIndex?: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const questions = draggedItem.type === 'question' 
      ? [{
          ...(draggedItem.data as Question),
          id: `${(draggedItem.data as Question).id}-${Date.now()}`,
          isFromMaster: true,
          masterQuestionId: (draggedItem.data as Question).id,
          originalText: (draggedItem.data as Question).question,
          originalOptions: (draggedItem.data as Question).options,
          originalPlaceholder: (draggedItem.data as Question).placeholder,
          originalMaxRating: (draggedItem.data as Question).maxRating,
          originalMaxTags: (draggedItem.data as Question).maxTags,
          isModified: false,
        }]
      : (draggedItem.data as QuestionPanel).questions.map(q => ({
          ...q,
          id: `${q.id}-${Date.now()}-${Math.random()}`,
          isFromMaster: true,
          masterQuestionId: q.id,
          originalText: q.question,
          originalOptions: q.options,
          originalPlaceholder: q.placeholder,
          originalMaxRating: q.maxRating,
          originalMaxTags: q.maxTags,
          isModified: false,
        }));

    setFormPages(prev => {
      const newPages = [...prev];
      const currentPage = [...(newPages[currentPageIndex] || [])];
      
      if (targetRowIndex !== undefined && targetColumnIndex !== undefined && dragPosition) {
        // Handle column-based dropping
        const { position } = dragPosition;
        
        if (position === 'center') {
          // Create new row with single column
          const newRow: Question[][] = [questions];
          currentPage.splice(targetRowIndex + 1, 0, newRow);
        } else {
          // Add to existing row as new column
          const targetRow = currentPage[targetRowIndex] || [];
          const newRow = [...targetRow];
          
          if (position === 'left') {
            newRow.unshift(questions);
          } else if (position === 'right') {
            newRow.push(questions);
          }
          
          // Limit to 2 columns maximum
          if (newRow.length > 2) {
            newRow.splice(2);
          }
          
          currentPage[targetRowIndex] = newRow;
        }
      } else {
        // Default: add as new row at the end
        currentPage.push([questions]);
      }
      
      newPages[currentPageIndex] = currentPage;
      return newPages;
    });

    setDraggedItem(null);
    setDragPosition(null);
  };

  const editQuestion = (question: Question) => {
    setEditingQuestion({ ...question });
    setIsEditDialogOpen(true);
  };

  const updateQuestion = (updatedQuestion: Question) => {
    setFormPages(prev => {
      const newPages = [...prev];
      const currentPage = newPages[currentPageIndex];
      
      const newPage = currentPage.map(row => 
        row.map(column => 
          column.map(q => {
            if (q.id === updatedQuestion.id) {
              // Check if this is a modification from the original
              const textChanged = q.originalText && updatedQuestion.question !== q.originalText;
              const optionsChanged = q.originalOptions && 
                JSON.stringify(updatedQuestion.options) !== JSON.stringify(q.originalOptions);
              
              // Check for placeholder changes (for text-based inputs)
              const hasPlaceholderType = ['text', 'email', 'tel', 'textarea'].includes(updatedQuestion.type);
              const placeholderChanged = hasPlaceholderType && updatedQuestion.placeholder !== q.originalPlaceholder;
              
              // Check for other property changes
              const ratingChanged = updatedQuestion.type === 'rating' && updatedQuestion.maxRating !== q.originalMaxRating;
              const tagsChanged = updatedQuestion.type === 'tags' && updatedQuestion.maxTags !== q.originalMaxTags;
              
              const isModified = q.isFromMaster && (
                textChanged || optionsChanged || placeholderChanged || ratingChanged || tagsChanged
              );
              
              return {
                ...updatedQuestion,
                isModified,
                // Preserve original values for comparison
                originalText: q.originalText,
                originalOptions: q.originalOptions,
                originalPlaceholder: q.originalPlaceholder,
                originalMaxRating: q.originalMaxRating,
                originalMaxTags: q.originalMaxTags,
                masterQuestionId: q.masterQuestionId,
                isFromMaster: q.isFromMaster,
              };
            }
            return q;
          })
        )
      );
      
      newPages[currentPageIndex] = newPage;
      return newPages;
    });
    
    setIsEditDialogOpen(false);
    setEditingQuestion(null);
  };

  const removeQuestion = (questionId: string) => {
    setFormPages(prev => {
      const newPages = [...prev];
      const currentPage = newPages[currentPageIndex];
      
      const newPage = currentPage.map(row => 
        row.map(column => 
          column.filter(q => q.id !== questionId)
        ).filter(column => column.length > 0) // Remove empty columns
      ).filter(row => row.length > 0); // Remove empty rows
      
      newPages[currentPageIndex] = newPage;
      return newPages;
    });
  };

  const addNewPage = () => {
    setFormPages(prev => [...prev, []]);
    setCurrentPageIndex(formPages.length);
  };

  const handleNext = async () => {
    const allQuestions = formPages.flat().flat().flat(); // Flatten all levels
    if (allQuestions.length === 0) return;

    if (!user || !eventId) {
      alert('Missing user or event information');
      return;
    }

    try {
      console.log('Saving questions to database:', allQuestions);
      
      // Convert questions to proper format and assign unique IDs
      const questionsWithIds = allQuestions.map((q, index) => ({
        ...q,
        id: q.id || `question-${Date.now()}-${index}`,
        question: q.question || q.text || `Question ${index + 1}`,
        type: q.type,
        options: q.options || (q.type === 'dropdown' || q.type === 'multiple-choice' || q.type === 'checkbox_group' ? ['Option 1', 'Option 2'] : null),
        required: q.required || false,
        page: Math.floor(index / 5) + 1 // Group questions into pages of 5
      }));

      // Save to database
      const { success, error } = await saveEventQuestions(
        eventId, 
        questionsWithIds, 
        user.id
      );

      if (!success) {
        console.error('Failed to save questions:', error);
        alert(`Failed to save questions: ${error}`);
        return;
      }

      // Update event status
      const { error: updateError } = await supabase
        .from('events')
        .update({ status: 'form_built' })
        .eq('id', eventId)
        .eq('organization_id', user.id);

      if (updateError) {
        console.error('Failed to update event status:', updateError);
      }

      console.log('Questions saved successfully');
      onNext(questionsWithIds);
    } catch (error) {
      console.error('Error saving questions:', error);
      alert('Failed to save questions. Please try again.');
    }
  };

  const getQuestionIcon = (type: Question['type']) => {
    const questionType = questionTypes.find(qt => qt.value === type);
    const Icon = questionType?.icon || HelpCircle;
    return <Icon className="h-4 w-4" />;
  };

  const createCustomQuestion = (questionType: string = 'text') => {
    const newQuestion: Question = {
      id: `custom-${Date.now()}`,
      type: questionType as Question['type'],
      question: `New ${questionType.replace(/[_-]/g, ' ')} Question`,
      required: false,
      placeholder: questionType === 'email' ? 'your@email.com' : 
                  questionType === 'tel' ? 'Mobile number' : 
                  questionType === 'textarea' ? 'Enter detailed response' :
                  'Enter response',
      options: ['dropdown', 'multiple-choice', 'checkbox_group'].includes(questionType) 
        ? ['Option 1', 'Option 2', 'Option 3'] 
        : undefined,
      maxRating: questionType === 'rating' ? 5 : undefined,
      maxTags: questionType === 'tags' ? 5 : undefined,
      // Mark as completely new question
      isFromMaster: false,
      isModified: false,
    };
    
    setFormPages(prev => {
      const newPages = [...prev];
      const currentPage = [...(newPages[currentPageIndex] || [])];
      currentPage.push([[newQuestion]]); // Add as new row with single column
      newPages[currentPageIndex] = currentPage;
      return newPages;
    });
  };

  // Form Preview Component - Now Interactive!
  const QuestionPreview = ({ question, index }: { question: Question; index: number }) => {
    const currentValue = formValues[question.id];
    
    const questionLabel = (
      <Label className="text-sm font-medium mb-2 block">
        {index + 1}. {question.question}
        {question.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
    );

    switch (question.type) {
      case 'text':
        return (
          <div className="space-y-2">
            {questionLabel}
            <Input 
              placeholder={question.placeholder || "Enter your response"}
              value={currentValue || ""}
              onChange={(e) => handleValueChange(question.id, e.target.value)}
              className="bg-background"
            />
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            {questionLabel}
            <Textarea 
              placeholder={question.placeholder || "Enter detailed response"}
              value={currentValue || ""}
              onChange={(e) => handleValueChange(question.id, e.target.value)}
              className="bg-background min-h-[80px]"
            />
          </div>
        );

      case 'email':
        return (
          <div className="space-y-2">
            {questionLabel}
            <Input 
              type="email"
              placeholder={question.placeholder || "your@email.com"}
              value={currentValue || ""}
              onChange={(e) => handleValueChange(question.id, e.target.value)}
              className="bg-background"
            />
          </div>
        );

      case 'tel':
        return (
          <div className="space-y-2">
            {questionLabel}
            <div className="flex">
              <div className="px-3 py-2 bg-muted border border-r-0 rounded-l text-sm text-muted-foreground">
                +91
              </div>
              <Input 
                type="tel"
                placeholder={question.placeholder || "Mobile number"}
                value={currentValue || ""}
                onChange={(e) => handleValueChange(question.id, e.target.value)}
                className="bg-background rounded-l-none"
              />
            </div>
          </div>
        );

      case 'dropdown':
        return (
          <div className="space-y-2">
            {questionLabel}
            <Select value={currentValue || ""} onValueChange={(value) => handleValueChange(question.id, value)}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder={question.options?.[0] || "Select an option"} />
              </SelectTrigger>
              <SelectContent>
                {question.options?.map((option, idx) => (
                  <SelectItem key={idx} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'multiple-choice':
        return (
          <div className="space-y-3">
            {questionLabel}
            <RadioGroup 
              value={currentValue || ""} 
              onValueChange={(value) => handleValueChange(question.id, value)}
              className="space-y-2"
            >
              {question.options?.map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-${idx}`} />
                  <Label htmlFor={`${question.id}-${idx}`} className="text-sm cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'checkbox_group':
        const checkboxValues = currentValue || [];
        const handleCheckboxChange = (option: string, checked: boolean) => {
          let newValues;
          if (checked) {
            newValues = [...checkboxValues, option];
          } else {
            newValues = checkboxValues.filter((v: string) => v !== option);
          }
          handleValueChange(question.id, newValues);
        };

        return (
          <div className="space-y-3">
            {questionLabel}
            <div className="space-y-2">
              {question.options?.slice(0, 8).map((option, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`${question.id}-${idx}`}
                    checked={checkboxValues.includes(option)}
                    onCheckedChange={(checked) => handleCheckboxChange(option, checked as boolean)}
                  />
                  <Label htmlFor={`${question.id}-${idx}`} className="text-sm cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
              {question.options && question.options.length > 8 && (
                <div className="text-xs text-muted-foreground pl-6">
                  ... and {question.options.length - 8} more options
                </div>
              )}
            </div>
            {checkboxValues.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Selected: {checkboxValues.length} option(s)
              </div>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div className="space-y-3">
            {questionLabel}
            <div className="flex items-center space-x-2">
              <Switch 
                checked={currentValue || false}
                onCheckedChange={(checked) => handleValueChange(question.id, checked)}
              />
              <Label className="text-sm cursor-pointer">
                {currentValue ? "Yes" : "No"}
              </Label>
            </div>
          </div>
        );

      case 'rating':
        const ratingValue = currentValue || 0;
        return (
          <div className="space-y-3">
            {questionLabel}
            <div className="flex items-center space-x-1">
              {Array.from({ length: question.maxRating || 5 }).map((_, idx) => (
                <Star 
                  key={idx} 
                  className={`h-6 w-6 cursor-pointer transition-colors ${
                    idx < ratingValue 
                      ? "text-yellow-400 fill-yellow-400" 
                      : "text-muted-foreground hover:text-yellow-200"
                  }`}
                  onClick={() => handleValueChange(question.id, idx + 1)}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-2">
                {ratingValue > 0 ? `${ratingValue}/${question.maxRating || 5}` : `Rate 1-${question.maxRating || 5}`}
              </span>
            </div>
          </div>
        );

      case 'tags':
        const tagValues = currentValue || [];
        const [newTag, setNewTag] = useState("");
        
        const addTag = () => {
          if (newTag.trim() && !tagValues.includes(newTag.trim()) && tagValues.length < (question.maxTags || 5)) {
            handleValueChange(question.id, [...tagValues, newTag.trim()]);
            setNewTag("");
          }
        };
        
        const removeTag = (tagToRemove: string) => {
          handleValueChange(question.id, tagValues.filter((tag: string) => tag !== tagToRemove));
        };

        return (
          <div className="space-y-3">
            {questionLabel}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {tagValues.map((tag: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20">
                    <span>{tag}</span>
                    <button
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {tagValues.length < (question.maxTags || 5) && (
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    className="bg-background text-xs h-8"
                  />
                  <Button size="sm" onClick={addTag} className="h-8 px-3 text-xs">
                    Add
                  </Button>
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {tagValues.length}/{question.maxTags || 5} tags used
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            {questionLabel}
            <div className="p-3 bg-muted/50 rounded border text-sm text-muted-foreground">
              Question type: {question.type}
            </div>
          </div>
        );
    }
  };

  // Edit Question Dialog Component
  const EditQuestionDialog = () => {
    const [tempQuestion, setTempQuestion] = useState<Question | null>(null);

    // Initialize tempQuestion when editing starts
    useEffect(() => {
      if (editingQuestion) {
        setTempQuestion({ ...editingQuestion });
      }
    }, [editingQuestion]);

    if (!editingQuestion || !tempQuestion) return null;

    const handleAddOption = () => {
      if (tempQuestion.options) {
        setTempQuestion({
          ...tempQuestion,
          options: [...tempQuestion.options, `Option ${tempQuestion.options.length + 1}`]
        });
      }
    };

    const handleRemoveOption = (index: number) => {
      if (tempQuestion.options) {
        setTempQuestion({
          ...tempQuestion,
          options: tempQuestion.options.filter((_, i) => i !== index)
        });
      }
    };

    const handleUpdateOption = (index: number, value: string) => {
      if (tempQuestion.options) {
        const newOptions = [...tempQuestion.options];
        newOptions[index] = value;
        setTempQuestion({
          ...tempQuestion,
          options: newOptions
        });
      }
    };

    const handleSave = () => {
      updateQuestion(tempQuestion);
    };

    const hasOptions = ['dropdown', 'multiple-choice', 'checkbox_group'].includes(tempQuestion.type);

    return (
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
            <DialogDescription>
              Modify the question text, options, and settings
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor="question-text">Question Text</Label>
              <Textarea
                id="question-text"
                value={tempQuestion.question}
                onChange={(e) => setTempQuestion({ ...tempQuestion, question: e.target.value })}
                placeholder="Enter your question"
                className="min-h-[80px]"
              />
            </div>

            {/* Placeholder for text inputs */}
            {(['text', 'textarea', 'email', 'tel'].includes(tempQuestion.type)) && (
              <div className="space-y-2">
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  value={tempQuestion.placeholder || ''}
                  onChange={(e) => setTempQuestion({ ...tempQuestion, placeholder: e.target.value })}
                  placeholder="Enter placeholder text"
                />
              </div>
            )}

            {/* Required Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="required"
                checked={tempQuestion.required}
                onCheckedChange={(checked) => setTempQuestion({ ...tempQuestion, required: checked })}
              />
              <Label htmlFor="required">Required field</Label>
            </div>

            {/* Options Management for dropdown, multiple-choice, checkbox_group */}
            {hasOptions && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Option
                  </Button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {tempQuestion.options?.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => handleUpdateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        className="h-10 w-10 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        disabled={tempQuestion.options && tempQuestion.options.length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                {tempQuestion.options && tempQuestion.options.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    At least one option is required for this question type.
                  </p>
                )}
              </div>
            )}

            {/* Rating Scale Max for rating type */}
            {tempQuestion.type === 'rating' && (
              <div className="space-y-2">
                <Label htmlFor="max-rating">Maximum Rating</Label>
                <Select
                  value={String(tempQuestion.maxRating || 5)}
                  onValueChange={(value) => setTempQuestion({ ...tempQuestion, maxRating: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={String(num)}>
                        {num} Stars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Max Tags for tags type */}
            {tempQuestion.type === 'tags' && (
              <div className="space-y-2">
                <Label htmlFor="max-tags">Maximum Tags</Label>
                <Select
                  value={String(tempQuestion.maxTags || 5)}
                  onValueChange={(value) => setTempQuestion({ ...tempQuestion, maxTags: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 4, 5, 6, 7, 8, 9, 10, 15, 20].map((num) => (
                      <SelectItem key={num} value={String(num)}>
                        {num} Tags
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview Section */}
            <div className="border rounded-lg p-4 bg-muted/20">
              <Label className="text-sm font-medium mb-3 block">Preview</Label>
              <QuestionPreview question={tempQuestion} index={0} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!tempQuestion.question.trim() || (hasOptions && (!tempQuestion.options || tempQuestion.options.length === 0))}
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto px-6 py-8 max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <GradientButton
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Event Details
              </GradientButton>
            </div>
            
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
                Build Registration Form
              </h1>
              <p className="text-muted-foreground">
                Drag questions from the left panel to build your registration form
              </p>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary text-sm font-medium">
                  ✓
                </div>
                <span className="text-primary">Event Details</span>
              </div>
              <div className="w-12 h-0.5 bg-primary"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                  2
                </div>
                <span className="font-medium text-primary">Questionnaires</span>
              </div>
              <div className="w-12 h-0.5 bg-border"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
                  3
                </div>
                <span className="text-muted-foreground">Header Design</span>
              </div>
              <div className="w-12 h-0.5 bg-border"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center text-muted-foreground text-sm">
                  4
                </div>
                <span className="text-muted-foreground">Generate Link</span>
              </div>
            </div>

            {/* Control Bar */}
            <div className="flex items-center justify-between mb-8 p-4 bg-card/50 rounded-lg border">
              <div className="flex items-center gap-4">
                {/* Page Navigation */}
                {formPages.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Pages:</span>
                    {formPages.map((_, index) => (
                      <Button
                        key={index}
                        variant={index === currentPageIndex ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPageIndex(index)}
                        className="h-8 w-8 p-0"
                      >
                        {index + 1}
                      </Button>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addNewPage}
                      className="h-8 px-3 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Page
                    </Button>
                  </div>
                )}
                
                {/* Form Statistics */}
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{formPages.flat().flat().flat().length} questions</span>
                  <span>•</span>
                  <span>{currentRows.length} rows</span>
                  {Object.keys(formValues).length > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-green-600">{Object.keys(formValues).length} responses</span>
                    </>
                  )}
                </div>
                
                {/* Split Pages Suggestion */}
                {formPages.length === 1 && currentRows.length >= 6 && (
                  <Button variant="outline" size="sm" onClick={addNewPage} className="bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100">
                    <Plus className="h-4 w-4 mr-1" />
                    Split into Pages
                  </Button>
                )}
              </div>
              
              {/* Main Action Buttons */}
              <div className="flex items-center gap-2">
                {formPages.length > 1 && currentPageIndex < formPages.length - 1 && (
                  <GradientButton
                    variant="outline"
                    onClick={() => setCurrentPageIndex(currentPageIndex + 1)}
                    className="flex items-center gap-2"
                  >
                    Next Page
                    <ArrowRight className="h-4 w-4" />
                  </GradientButton>
                )}
                {currentQuestions.length > 0 && (
                  <GradientButton
                    onClick={handleNext}
                    className="flex items-center gap-2"
                  >
                    {formPages.length > 1 || currentQuestions.length > 5 ? (
                      <>Finish Form <ArrowRight className="h-4 w-4" /></>
                    ) : (
                      <>Continue <ArrowRight className="h-4 w-4" /></>
                    )}
                  </GradientButton>
                )}
              </div>
            </div>
          </div>

          {/* Main Layout: Left Panel + Right Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-380px)]">
            {/* Left Panel - Question Bank */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Building className="h-5 w-5 text-primary" />
                    Question Bank
                  </CardTitle>
                  <CardDescription>
                    Drag questions or panels to the form builder
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Pre-built Panels */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">PANELS</h4>
                    {questionPanels.map((panel) => (
                      <div
                        key={panel.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, { type: 'panel', data: panel })}
                        className="p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20 cursor-grab hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">{panel.title}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {panel.questions.length} questions
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Individual Questions */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">QUESTIONS</h4>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {questionBank.map((question) => (
                        <div
                          key={question.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, { type: 'question', data: question })}
                          className="p-2 bg-secondary/30 rounded-md border cursor-grab hover:bg-secondary/50 transition-colors group"
                        >
                          <div className="flex items-center gap-2">
                            {getQuestionIcon(question.type)}
                            <span className="text-sm truncate flex-1">{question.question}</span>
                            {question.required && (
                              <span className="text-xs text-red-500">*</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Custom Question Types */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground">CUSTOM</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {questionTypes.slice(0, 8).map((type) => {
                        const Icon = type.icon;
                        return (
                          <div
                            key={type.value}
                            onClick={() => createCustomQuestion(type.value)}
                            className="p-2 bg-muted/50 rounded-md border cursor-pointer hover:bg-muted hover:shadow-sm transition-all text-center group"
                          >
                            <Icon className="h-4 w-4 mx-auto mb-1 group-hover:text-primary transition-colors" />
                            <span className="text-xs block">{type.label}</span>
                            <span className="text-[10px] text-muted-foreground">{type.description}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Form Responses Preview */}
              {Object.keys(formValues).length > 0 && (
                <Card className="border-0 shadow-card bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckSquare className="h-4 w-4 text-green-600" />
                      Live Responses ({Object.keys(formValues).length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {Object.entries(formValues).slice(0, 5).map(([questionId, value]) => {
                        const question = currentQuestions.find(q => q.id === questionId);
                        if (!question || !value || (Array.isArray(value) && value.length === 0)) return null;
                        
                        return (
                          <div key={questionId} className="p-2 bg-white/60 dark:bg-gray-900/60 rounded text-xs">
                            <div className="font-medium text-green-700 dark:text-green-400 mb-1 truncate">
                              {question.question}
                            </div>
                            <div className="text-gray-700 dark:text-gray-300 truncate">
                              {Array.isArray(value) ? value.join(", ") : String(value)}
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(formValues).length > 5 && (
                        <div className="text-xs text-muted-foreground text-center py-1">
                          +{Object.keys(formValues).length - 5} more responses...
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Panel - Form Builder */}
            <div className="lg:col-span-3">
              <Card className="border-0 shadow-elegant bg-card/50 backdrop-blur-sm h-full">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    <span>Form Builder - Page {currentPageIndex + 1}</span>
                    <span className="text-sm text-muted-foreground">({currentQuestions.length} questions)</span>
                  </div>
                  <CardDescription>
                    Drop questions here to build your registration form
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-full">
                  <div className="min-h-[400px] p-4">
                    {currentRows.length === 0 ? (
                      <div 
                        className="flex flex-col items-center justify-center h-96 text-center border-2 border-dashed rounded-lg transition-colors bg-muted/20 border-muted"
                        onDragOver={(e) => handleDragOver(e)}
                        onDrop={(e) => handleDrop(e)}
                        onDragLeave={handleDragLeave}
                      >
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                          <ArrowRight className="h-8 w-8 text-muted-foreground rotate-180" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Drop Questions Here</h3>
                        <p className="text-muted-foreground max-w-md mb-4">
                          Drag questions from the left panel to start building your form.
                        </p>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <div className="flex items-center gap-2">
                            <Square className="h-3 w-3" />
                            <span>Drop in CENTER for single column</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Columns className="h-3 w-3" />
                            <span>Drop on LEFT/RIGHT for side-by-side columns</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {currentRows.map((row, rowIndex) => (
                          <div key={rowIndex} className="relative">
                            {/* Row Container */}
                            <div 
                              className={`grid gap-4 ${row.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}
                            >
                              {row.map((column, columnIndex) => (
                                <div
                                  key={`${rowIndex}-${columnIndex}`}
                                  className={`relative border-2 border-dashed rounded-lg p-4 transition-all ${
                                    dragPosition?.rowIndex === rowIndex && dragPosition?.columnIndex === columnIndex
                                      ? dragPosition.position === 'center' 
                                        ? 'border-green-400 bg-green-50 dark:bg-green-950/20'
                                        : dragPosition.position === 'left'
                                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 border-l-4'
                                        : 'border-purple-400 bg-purple-50 dark:bg-purple-950/20 border-r-4'
                                      : 'border-transparent'
                                  }`}
                                  onDragOver={(e) => handleDragOver(e, rowIndex, columnIndex)}
                                  onDrop={(e) => handleDrop(e, rowIndex, columnIndex)}
                                  onDragLeave={handleDragLeave}
                                >
                                  {/* Drop Zone Indicators */}
                                  {draggedItem && (
                                    <div className="absolute inset-0 pointer-events-none">
                                      {/* Left Zone */}
                                      <div className="absolute left-0 top-0 w-1/4 h-full bg-blue-200/30 dark:bg-blue-800/30 rounded-l-lg opacity-0 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center justify-center h-full text-xs text-blue-600 font-medium">
                                          LEFT
                                        </div>
                                      </div>
                                      {/* Right Zone */}
                                      <div className="absolute right-0 top-0 w-1/4 h-full bg-purple-200/30 dark:bg-purple-800/30 rounded-r-lg opacity-0 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center justify-center h-full text-xs text-purple-600 font-medium">
                                          RIGHT
                                        </div>
                                      </div>
                                      {/* Center Zone */}
                                      <div className="absolute left-1/4 top-0 w-1/2 h-full bg-green-200/30 dark:bg-green-800/30 opacity-0 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center justify-center h-full text-xs text-green-600 font-medium">
                                          CENTER
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Questions in Column */}
                                  <div className="space-y-4">
                                    {column.map((question, questionIndex) => {
                                      const globalIndex = currentRows.slice(0, rowIndex).flat().flat().length + 
                                                        row.slice(0, columnIndex).flat().length + questionIndex;
                                      return (
                                        <div
                                          key={question.id}
                                          className="bg-background rounded-lg border hover:shadow-md transition-all group relative p-4"
                                        >
                                          {/* Question Type Badge */}
                                          <div className="absolute top-2 right-2 flex items-center gap-2">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                              {getQuestionIcon(question.type)}
                                              <span className="capitalize">{question.type.replace(/[_-]/g, ' ')}</span>
                                            </div>
                                            {/* Status indicators */}
                                            {question.isModified && (
                                              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                                <Edit3 className="h-3 w-3" />
                                                <span>Modified</span>
                                              </div>
                                            )}
                                            {!question.isFromMaster && (
                                              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                                                <Plus className="h-3 w-3" />
                                                <span>New</span>
                                              </div>
                                            )}
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => editQuestion(question)}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                            >
                                              <Edit3 className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => removeQuestion(question.id)}
                                              className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground h-6 w-6 p-0"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>

                                          {/* Form Preview */}
                                          <div className="pr-16">
                                            <QuestionPreview question={question} index={globalIndex} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Row Info */}
                            <div className="absolute -left-8 top-2 text-xs text-muted-foreground">
                              Row {rowIndex + 1}
                            </div>
                          </div>
                        ))}
                        
                        {/* Add Row Drop Zone */}
                        <div 
                          className="border-2 border-dashed border-muted/50 rounded-lg p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors"
                          onDragOver={(e) => handleDragOver(e)}
                          onDrop={(e) => handleDrop(e)}
                          onDragLeave={handleDragLeave}
                        >
                          <Plus className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Drop here to add a new row
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Question Dialog */}
      <EditQuestionDialog />
    </PageTransition>
  );
};