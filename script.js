// 全局变量

// 格式化用时函数（全局可用）
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}小时`;
    if (minutes > 0) result += `${minutes}分钟`;
    result += `${secs}秒`;
    return result;
}
let currentQuestionIndex = 0;
let answers = [];
let startTime = null;
let timerInterval = null;
let timeLeft = 45 * 60; // 45分钟
let userInfo = {};
let testStartTime = null;

// DOM元素
const startScreen = document.getElementById('start-screen');
const testScreen = document.getElementById('test-screen');
const resultScreen = document.getElementById('result-screen');
const userInfoForm = document.getElementById('user-info-form');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const questionNumber = document.getElementById('question-number');
const questionText = document.getElementById('question-text');
const options = document.querySelectorAll('.option input[type="radio"]');
const currentQuestionEl = document.getElementById('current-question');
const totalQuestionsEl = document.getElementById('total-questions');
const remainingQuestionsEl = document.getElementById('remaining-questions');
const progressFill = document.getElementById('progress-fill');
const timeLeftEl = document.getElementById('time-left');
const themeToggle = document.getElementById('theme-toggle');
const downloadPdfBtn = document.getElementById('download-pdf');
const downloadImageBtn = document.getElementById('download-image');
const restartTestBtn = document.getElementById('restart-test');

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    // 主题切换
    themeToggle.addEventListener('click', toggleTheme);
    
    // 检查本地存储的主题设置
    if (localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
    }
    
    // 加载用户数据
    loadUserData();
    
    // 初始化生日选择器
    initBirthdayPicker();
    
    // 表单提交
    userInfoForm.addEventListener('submit', startTest);
    
    // 查看往期数据按钮
    const viewHistoryBtn = document.getElementById('view-history');
    if (viewHistoryBtn) {
        viewHistoryBtn.addEventListener('click', showHistoryScreen);
    }
    
    // 测试导航
    prevBtn.addEventListener('click', goToPreviousQuestion);
    nextBtn.addEventListener('click', goToNextQuestion);
    
    // 选项选择
    options.forEach(option => {
        option.addEventListener('change', () => {
            // 启用下一题按钮
            nextBtn.disabled = false;
        });
    });
    
    // 下载按钮
    downloadPdfBtn.addEventListener('click', downloadPDF);
    downloadImageBtn.addEventListener('click', downloadImage);
    restartTestBtn.addEventListener('click', restartTest);
});

// 开始测试
function startTest(e) {
    e.preventDefault();
    
    // 收集用户信息
    const nickname = document.getElementById('nickname').value;
    const birthday = document.getElementById('birthday').value;
    const gender = document.getElementById('gender').value;
    
    // 计算年龄
    const age = calculateAge(new Date(birthday));
    
    userInfo = {
        nickname,
        birthday,
        gender,
        age,
        startTime: new Date()
    };
    
    // 保存用户数据到本地存储
    saveUserData(userInfo);
    
    testStartTime = new Date();
    
    // 初始化答案数组
    answers = new Array(scl90Questions.length).fill(null);
    
    // 添加开始动画效果
    document.body.classList.add('starting');
    startScreen.classList.add('starting');
    
    // 延迟执行页面切换，让动画完成
    setTimeout(() => {
        // 隐藏开始页面，显示测试页面
        startScreen.classList.add('hidden');
        startScreen.classList.remove('starting');
        testScreen.classList.remove('hidden');
        document.body.classList.remove('starting');
        document.body.classList.add('testing'); // 添加testing类来调整主题按钮位置
        
        // 显示第一题
        showQuestion(currentQuestionIndex);
        
        // 启动计时器
        startTimer();
    }, 600); // 动画持续时间
}

// 计算年龄
function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

// 显示题目
function showQuestion(index) {
    const question = scl90Questions[index];
    
    // 更新题目信息
    questionNumber.textContent = `第 ${question.id} 题`;
    questionText.textContent = question.text;
    
    // 更新进度信息
    currentQuestionEl.textContent = `第 ${index + 1} 题`;
    totalQuestionsEl.textContent = `共 ${scl90Questions.length} 题`;
    remainingQuestionsEl.textContent = `剩余 ${scl90Questions.length - index - 1} 题`;
    
    // 更新进度条
    const progress = ((index + 1) / scl90Questions.length) * 100;
    progressFill.style.width = `${progress}%`;
    
    // 重置选项
    options.forEach((option, i) => {
        option.checked = answers[index] === String(i + 1);
    });
    
    // 更新导航按钮状态
    prevBtn.disabled = index === 0;
    nextBtn.disabled = answers[index] === null;
    
    // 如果是最后一题，更改按钮文本
    nextBtn.textContent = index === scl90Questions.length - 1 ? '完成测试' : '下一题';
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 上一题
function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
        // 保存当前答案
        saveCurrentAnswer();
        currentQuestionIndex--;
        showQuestion(currentQuestionIndex);
    }
}

// 下一题
function goToNextQuestion() {
    // 保存当前答案
    saveCurrentAnswer();
    
    if (currentQuestionIndex < scl90Questions.length - 1) {
        currentQuestionIndex++;
        showQuestion(currentQuestionIndex);
    } else {
        // 完成测试
        finishTest();
    }
}

// 保存当前答案
function saveCurrentAnswer() {
    const selectedOption = document.querySelector('.option input[type="radio"]:checked');
    if (selectedOption) {
        answers[currentQuestionIndex] = selectedOption.value;
    }
}

// 启动计时器
function startTimer() {
    timerInterval = setInterval(() => {
        timeLeft--;
        
        // 计算分钟和秒
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        
        // 更新显示
        timeLeftEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 时间到，自动提交
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishTest();
        }
    }, 1000);
}

// 完成测试
function finishTest() {
    // 停止计时器
    clearInterval(timerInterval);
    
    // 移除testing类，恢复主题按钮位置
    document.body.classList.remove('testing');
    
    // 保存测试结束时间
    const endTime = new Date();
    const duration = Math.floor((endTime - testStartTime) / 1000); // 秒
    
    // 计算得分
    const scores = calculateScores();
    
    // 保存测试结果
    saveTestResult(userInfo, scores, answers);
    
    // 显示结果页面
    showResults(scores, endTime, duration);
    
    // 切换页面
    testScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
}

// 计算得分
function calculateScores() {
    const scores = {
        somatization: 0,
        obsessive: 0,
        interpersonal: 0,
        depression: 0,
        anxiety: 0,
        hostility: 0,
        phobic: 0,
        paranoid: 0,
        psychotic: 0,
        other: 0,
        total: 0
    };
    
    // 统计各类别得分
    answers.forEach((answer, index) => {
        if (answer) {
            const value = parseInt(answer);
            const category = scl90Questions[index].category;
            scores[category] += value;
            scores.total += value;
        }
    });
    
    // 计算总均分
    scores.mean = (scores.total / scl90Questions.length).toFixed(2);
    
    return scores;
}

// 显示结果
function showResults(scores, endTime, duration) {
    // 格式化测试时间
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}:${date.getSeconds().toString().padStart(2, '0')}`;
    };
    
    // 确保userInfo.startTime是Date对象
    const startTime = userInfo.startTime instanceof Date ? userInfo.startTime : new Date(userInfo.startTime);
    
    // 1. 更新用户信息表格
    document.getElementById('result-nickname').textContent = userInfo.nickname || '未知用户';
    document.getElementById('result-gender').textContent = userInfo.gender || '未知';
    document.getElementById('result-age').textContent = `${userInfo.age || 0}岁`;
    document.getElementById('score-total-display').textContent = scores.total;
    document.getElementById('result-duration').textContent = formatDuration(duration);
    document.getElementById('result-test-time').textContent = formatDate(startTime);
    
    // 2. 更新总评估结果表格
    document.getElementById('total-score').textContent = scores.total;
    document.getElementById('average-score').textContent = scores.mean;
    
    // 计算阳性项目数（得分>=2的项目）
    const positiveItems = Object.values(scores).filter(score => parseFloat(score) >= 2).length - 2; // 减去total和mean
    document.getElementById('positive-items').textContent = positiveItems;
    
    // 判断数值范围
    const scoreRange = scores.mean >= 2 ? '阳性' : '阴性';
    document.getElementById('score-range').textContent = scoreRange;
    
    // 3. 更新各项症状评估结果表格
    const symptomsData = [
        { name: '躯体化', score: scores.somatization, mean: (scores.somatization / 12).toFixed(2) },
        { name: '强迫症状', score: scores.obsessive, mean: (scores.obsessive / 10).toFixed(2) },
        { name: '人际关系敏感', score: scores.interpersonal, mean: (scores.interpersonal / 9).toFixed(2) },
        { name: '抑郁', score: scores.depression, mean: (scores.depression / 13).toFixed(2) },
        { name: '焦虑', score: scores.anxiety, mean: (scores.anxiety / 10).toFixed(2) },
        { name: '敌对', score: scores.hostility, mean: (scores.hostility / 6).toFixed(2) },
        { name: '恐怖', score: scores.phobic, mean: (scores.phobic / 7).toFixed(2) },
        { name: '偏执', score: scores.paranoid, mean: (scores.paranoid / 6).toFixed(2) },
        { name: '精神病性', score: scores.psychotic, mean: (scores.psychotic / 10).toFixed(2) },
        { name: '其他', score: scores.other, mean: (scores.other / 7).toFixed(2) }
    ];
    
    const symptomsTbody = document.getElementById('symptoms-tbody');
    symptomsTbody.innerHTML = '';
    
    symptomsData.forEach(symptom => {
        const level = getScoreLevel(parseFloat(symptom.mean));
        const levelText = level === 'normal' ? '正常' : 
                         level === 'mild' ? '轻度' :
                         level === 'moderate' ? '中度' : '重度';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${symptom.name}</td>
            <td>${symptom.score}</td>
            <td>${symptom.mean}</td>
            <td class="level-${level}">${levelText}</td>
        `;
        symptomsTbody.appendChild(row);
    });
    
    // 4. 生成各个因子分析
    generateFactorAnalysis(scores);
    
    // 5. 绘制图表
    drawChart(scores);
}

// 根据得分获取等级
function getScoreLevel(score) {
    if (score < 1.5) return 'normal';
    if (score < 2.5) return 'mild';
    if (score < 3.5) return 'moderate';
    return 'severe';
}

// 更新得分并设置颜色
function updateScoreWithColor(elementId, score) {
    const element = document.getElementById(elementId);
    element.textContent = score;
    
    // 根据得分设置颜色等级
    const level = getScoreLevel(score);
    element.className = 'score-value ' + level;
}

// 生成各个因子分析
function generateFactorAnalysis(scores) {
    const factorAnalysisContainer = document.getElementById('factor-analysis-container');
    factorAnalysisContainer.innerHTML = '';
    
    // 因子分析数据
    const factorData = {
        somatization: {
            name: '躯体化因子分析',
            score: scores.somatization,
            mean: (scores.somatization / 12).toFixed(2),
            range: '12-60分之间',
            highScore: '36分以上',
            highScoreDesc: '表明个体的躯体化症状较为明显，可能经常感到身体不适，如头痛、背痛、肌肉酸痛等。',
            lowScore: '24分以下',
            lowScoreDesc: '表明个体躯体化症状较轻，身体感受良好。',
            analysis: '得分越高，躯体化症状越明显；得分越低，躯体化症状越不明显。'
        },
        obsessive: {
            name: '强迫症状因子分析',
            score: scores.obsessive,
            mean: (scores.obsessive / 10).toFixed(2),
            range: '10-50分之间',
            highScore: '30分以上',
            highScoreDesc: '表明个体的强迫症状较为明显，可能经常出现强迫思维和行为，如反复检查、计数等。',
            lowScore: '20分以下',
            lowScoreDesc: '表明个体强迫症状较轻，思维和行为较为自由。',
            analysis: '得分越高，强迫症状越明显；得分越低，强迫症状越不明显。'
        },
        interpersonal: {
            name: '人际关系敏感因子分析',
            score: scores.interpersonal,
            mean: (scores.interpersonal / 9).toFixed(2),
            range: '9-45分之间',
            highScore: '27分以上',
            highScoreDesc: '表明个体在人际交往中较为敏感，可能经常感到别人不理解自己，或在人群中感到不自在。',
            lowScore: '18分以下',
            lowScoreDesc: '表明个体人际关系敏感度较低，能够较好地处理人际关系。',
            analysis: '得分越高，人际关系敏感度越高；得分越低，人际关系敏感度越低。'
        },
        depression: {
            name: '抑郁因子分析',
            score: scores.depression,
            mean: (scores.depression / 13).toFixed(2),
            range: '13-65分之间',
            highScore: '39分以上',
            highScoreDesc: '表明个体的抑郁程度较强，生活缺乏足够的兴趣，缺乏运动活力，极端情况下，可能会有想死亡的思想和自杀的观念。',
            lowScore: '26分以下',
            lowScoreDesc: '表明个体抑郁程度较弱，生活态度乐观积极，充满活力，心境愉快。',
            analysis: '得分越高，抑郁程度越明显；得分越低，抑郁程度越不明显。'
        },
        anxiety: {
            name: '焦虑因子分析',
            score: scores.anxiety,
            mean: (scores.anxiety / 10).toFixed(2),
            range: '10-50分之间',
            highScore: '30分以上',
            highScoreDesc: '表明个体的焦虑症状较为明显，可能经常感到紧张、担心、坐立不安等。',
            lowScore: '20分以下',
            lowScoreDesc: '表明个体焦虑症状较轻，情绪较为平静稳定。',
            analysis: '得分越高，焦虑程度越明显；得分越低，焦虑程度越不明显。'
        },
        hostility: {
            name: '敌对因子分析',
            score: scores.hostility,
            mean: (scores.hostility / 6).toFixed(2),
            range: '6-30分之间',
            highScore: '18分以上',
            highScoreDesc: '表明个体的敌对情绪较为明显，可能经常感到烦躁、易怒，有攻击倾向。',
            lowScore: '12分以下',
            lowScoreDesc: '表明个体敌对情绪较轻，性情较为温和。',
            analysis: '得分越高，敌对情绪越明显；得分越低，敌对情绪越不明显。'
        },
        phobic: {
            name: '恐怖因子分析',
            score: scores.phobic,
            mean: (scores.phobic / 7).toFixed(2),
            range: '7-35分之间',
            highScore: '21分以上',
            highScoreDesc: '表明个体的恐怖症状较为明显，可能对某些事物或情境存在过度的恐惧。',
            lowScore: '14分以下',
            lowScoreDesc: '表明个体恐怖症状较轻，恐惧感较弱。',
            analysis: '得分越高，恐怖症状越明显；得分越低，恐怖症状越不明显。'
        },
        paranoid: {
            name: '偏执因子分析',
            score: scores.paranoid,
            mean: (scores.paranoid / 6).toFixed(2),
            range: '6-30分之间',
            highScore: '18分以上',
            highScoreDesc: '表明个体的偏执症状较为明显，可能经常感到别人在议论自己，或对别人缺乏信任。',
            lowScore: '12分以下',
            lowScoreDesc: '表明个体偏执症状较轻，对他人较为信任。',
            analysis: '得分越高，偏执症状越明显；得分越低，偏执症状越不明显。'
        },
        psychotic: {
            name: '精神病性因子分析',
            score: scores.psychotic,
            mean: (scores.psychotic / 10).toFixed(2),
            range: '10-50分之间',
            highScore: '30分以上',
            highScoreDesc: '表明个体的精神病性症状较为明显，可能经常出现幻觉、妄想等症状。',
            lowScore: '20分以下',
            lowScoreDesc: '表明个体精神病性症状较轻，思维较为清晰正常。',
            analysis: '得分越高，精神病性症状越明显；得分越低，精神病性症状越不明显。'
        },
        other: {
            name: '其他因子分析',
            score: scores.other,
            mean: (scores.other / 7).toFixed(2),
            range: '7-35分之间',
            highScore: '21分以上',
            highScoreDesc: '表明个体在其他方面存在一定程度的心理困扰，如睡眠障碍、饮食问题等。',
            lowScore: '14分以下',
            lowScoreDesc: '表明个体在其他方面的症状较轻。',
            analysis: '得分越高，其他症状越明显；得分越低，其他症状越不明显。'
        }
    };
    
    // 为每个因子生成分析
    Object.keys(factorData).forEach(factorKey => {
        const factor = factorData[factorKey];
        const level = getScoreLevel(parseFloat(factor.mean));
        
        const factorDiv = document.createElement('div');
        factorDiv.className = 'factor-analysis';
        factorDiv.innerHTML = `
            <h4>${factor.name}</h4>
            <div class="factor-score-info">
                <p><strong>测评评分：</strong>${factor.score}</p>
                <p><strong>均分：</strong>${factor.mean}</p>
            </div>
            <div class="level-table">
                <table>
                    <tr>
                        <td class="level-normal ${level === 'normal' ? 'active' : ''}">正常</td>
                        <td class="level-mild ${level === 'mild' ? 'active' : ''}">轻度</td>
                        <td class="level-moderate ${level === 'moderate' ? 'active' : ''}">中度</td>
                        <td class="level-severe ${level === 'severe' ? 'active' : ''}">重度</td>
                    </tr>
                </table>
            </div>
            <div class="factor-description">
                <p>总分范围在${factor.range}。得分在${factor.highScore}，${factor.highScoreDesc}</p>
                <p>得分在${factor.lowScore}，${factor.lowScoreDesc}</p>
                <p>${factor.analysis}</p>
                <p><strong>您的测评参考结果为${level === 'normal' ? '正常' : level === 'mild' ? '轻度' : level === 'moderate' ? '中度' : '重度'}，${level !== 'normal' ? '建议寻求专业帮助。' : '请继续保持良好的心理状态。'}</strong></p>
            </div>
        `;
        
        factorAnalysisContainer.appendChild(factorDiv);
    });
}

// 生成结果解释（保留原函数用于历史兼容性）
function generateInterpretation(scores) {
    const interpretation = document.getElementById('result-interpretation');
    if (!interpretation) return;
    
    let level = '';
    
    if (scores.mean < 1.5) {
        level = 'normal';
    } else if (scores.mean < 2.5) {
        level = 'mild';
    } else if (scores.mean < 3.5) {
        level = 'moderate';
    } else {
        level = 'severe';
    }
    
    document.getElementById('result-interpretation').textContent = interpretation[level];
}

// 绘制图表
function drawChart(scores) {
    const ctx = document.getElementById('result-chart').getContext('2d');
    
    // 检查是否是移动设备
    const isMobile = window.innerWidth < 768;
    
    // 图表数据
    const data = {
        labels: Object.values(categories),
        datasets: [{
            label: '得分',
            data: [
                scores.somatization,
                scores.obsessive,
                scores.interpersonal,
                scores.depression,
                scores.anxiety,
                scores.hostility,
                scores.phobic,
                scores.paranoid,
                scores.psychotic,
                scores.other
            ],
            backgroundColor: [
                'rgba(67, 97, 238, 0.6)',
                'rgba(72, 187, 120, 0.6)',
                'rgba(246, 194, 62, 0.6)',
                'rgba(237, 100, 166, 0.6)',
                'rgba(165, 180, 252, 0.6)',
                'rgba(255, 159, 64, 0.6)',
                'rgba(75, 192, 192, 0.6)',
                'rgba(153, 102, 255, 0.6)',
                'rgba(255, 99, 132, 0.6)',
                'rgba(108, 117, 125, 0.6)'
            ],
            borderColor: [
                'rgba(67, 97, 238, 1)',
                'rgba(72, 187, 120, 1)',
                'rgba(246, 194, 62, 1)',
                'rgba(237, 100, 166, 1)',
                'rgba(165, 180, 252, 1)',
                'rgba(255, 159, 64, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 99, 132, 1)',
                'rgba(108, 117, 125, 1)'
            ],
            borderWidth: isMobile ? 1 : 2
        }]
    };
    
    // 图表配置
    const config = {
        type: isMobile ? 'horizontalBar' : 'bar',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: document.body.classList.contains('dark') ? 'rgba(30, 30, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                    titleColor: document.body.classList.contains('dark') ? '#e0e0e0' : '#333333',
                    bodyColor: document.body.classList.contains('dark') ? '#a0a0a0' : '#666666',
                    borderColor: document.body.classList.contains('dark') ? '#333333' : '#e0e0e0',
                    borderWidth: 1,
                    bodyFont: {
                        size: isMobile ? 10 : 12
                    },
                    titleFont: {
                        size: isMobile ? 11 : 13
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: document.body.classList.contains('dark') ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
                    },
                    ticks: {
                        color: document.body.classList.contains('dark') ? '#a0a0a0' : '#666666',
                        font: {
                            size: isMobile ? 10 : 12
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: document.body.classList.contains('dark') ? '#a0a0a0' : '#666666',
                        font: {
                            size: isMobile ? 10 : 12
                        },
                        autoSkip: isMobile,
                        maxRotation: isMobile ? 0 : 45,
                        minRotation: isMobile ? 0 : 45
                    }
                }
            }
        }
    };
    
    // 为Chart.js v3+ 适配水平条形图
    if (isMobile) {
        config.type = 'bar';
        config.options.indexAxis = 'y';
    }
    
    // 创建图表
    new Chart(ctx, config);
}

// 下载PDF
function downloadPDF() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const resultContainer = document.querySelector('.result-container');
        
        // 设置字体以支持中文
        doc.setFont('helvetica');
        
        // 获取结果容器的尺寸
        const containerWidth = resultContainer.offsetWidth;
        const containerHeight = resultContainer.offsetHeight;
        
        // 页面尺寸
        const pageWidth = 210; // A4宽度(mm)
        const pageHeight = 297; // A4高度(mm)
        
        // 计算最佳缩放比例 - 保持原始比例，适应A4页面
        const margin = 20; // 边距
        const availableWidth = pageWidth - (margin * 2); // 可用宽度
        const availableHeight = pageHeight - (margin * 2); // 可用高度
        
        // 计算缩放比例，保持宽高比
        const scale = Math.min(availableWidth / containerWidth, availableHeight / containerHeight);
        
        // 计算最终图片尺寸
        const finalWidth = containerWidth * scale;
        const finalHeight = containerHeight * scale;
        
        // 创建canvas并绘制结果页面 - 优化参数以提高清晰度
        html2canvas(resultContainer, {
            scale: 2, // 适当降低缩放以提高性能和减少文件大小
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff', // 强制白色背景
            width: containerWidth,
            height: containerHeight,
            scrollX: 0,
            scrollY: 0,
            windowWidth: containerWidth,
            windowHeight: containerHeight,
            allowTaint: true, // 允许跨域图片
            taintTest: false // 跳过污染测试以提高性能
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png', 0.95); // 高质量但不过度
            
            // 如果内容高度超过单页可用高度，需要分页处理
            if (finalHeight > availableHeight) {
                // 计算每页应该显示的内容高度（像素）
                const contentPerPage = Math.floor(availableHeight / scale);
                const totalPages = Math.ceil(containerHeight / contentPerPage);
                
                // 使用Promise来确保所有页面都处理完成
                const pagePromises = [];
                
                for (let page = 0; page < totalPages; page++) {
                    if (page > 0) {
                        doc.addPage();
                    }
                    
                    // 计算当前页的内容区域
                    const startY = page * contentPerPage;
                    const endY = Math.min(startY + contentPerPage, containerHeight);
                    const pageHeightPixels = endY - startY;
                    
                    // 如果这一页有内容才添加
                    if (pageHeightPixels > 50) { // 只有当内容高度大于50像素时才添加页面
                        const pagePromise = html2canvas(resultContainer, {
                            scale: 2,
                            useCORS: true,
                            logging: false,
                            backgroundColor: '#ffffff',
                            width: containerWidth,
                            height: pageHeightPixels,
                            x: 0,
                            y: startY,
                            scrollX: 0,
                            scrollY: startY,
                            windowWidth: containerWidth,
                            windowHeight: containerHeight,
                            allowTaint: true,
                            taintTest: false
                        }).then(pageCanvas => {
                            const pageImgData = pageCanvas.toDataURL('image/png', 0.95);
                            const pageImgWidth = finalWidth;
                            const pageImgHeight = pageHeightPixels * scale;
                            
                            // 计算垂直居中位置
                            const centerY = (pageHeight - pageImgHeight) / 2;
                            
                            doc.addImage(pageImgData, 'PNG', margin, Math.max(margin, centerY), 
                                       pageImgWidth, pageImgHeight, '', 'FAST');
                        });
                        
                        pagePromises.push(pagePromise);
                    }
                }
                
                // 等待所有页面处理完成后再保存PDF
                Promise.all(pagePromises).then(() => {
                    // 保存PDF
                    doc.save(generateFileName('pdf'));
                });
                
                // 等待所有页面处理完成后再保存PDF
                Promise.all(pagePromises).then(() => {
                    // 保存PDF
                    doc.save(generateFileName('pdf'));
                });
            } else {
                // 单页可以显示完整内容 - 居中显示
                const centerX = (pageWidth - finalWidth) / 2;
                const centerY = (pageHeight - finalHeight) / 2;
                
                doc.addImage(imgData, 'PNG', centerX, centerY, finalWidth, finalHeight, '', 'FAST');
                
                // 保存PDF
                doc.save(generateFileName('pdf'));
            }
        }).catch(err => {
            console.error('PDF生成失败:', err);
            alert('PDF下载失败，请重试。');
        });
    } catch (error) {
        console.error('PDF下载错误:', error);
        alert('PDF下载功能需要额外的库支持，请重试。');
    }
}

// 保存测试结果数据
function saveTestResult(userInfo, scores, answers) {
    try {
        const resultData = {
            id: Date.now(), // 使用时间戳作为唯一ID
            userInfo: userInfo,
            scores: scores,
            answers: answers,
            testTime: new Date().toISOString(),
            duration: (Date.now() - new Date(userInfo.startTime).getTime()) / 1000 // 测试用时（秒）
        };
        
        // 获取已保存的结果
        let savedResults = JSON.parse(localStorage.getItem('testResults') || '[]');
        
        // 添加新结果（最多保存20条记录）
        savedResults.unshift(resultData);
        if (savedResults.length > 20) {
            savedResults = savedResults.slice(0, 20);
        }
        
        localStorage.setItem('testResults', JSON.stringify(savedResults));
        console.log('测试结果已保存');
        return true;
    } catch (error) {
        console.error('保存测试结果失败:', error);
        return false;
    }
}

// 获取保存的测试结果
function getSavedTestResults() {
    try {
        const savedResults = localStorage.getItem('testResults');
        return savedResults ? JSON.parse(savedResults) : [];
    } catch (error) {
        console.error('获取测试结果失败:', error);
        return [];
    }
}

// 显示往期数据列表
function showHistoryResults() {
    const results = getSavedTestResults();
    const historyContainer = document.getElementById('history-results');
    
    if (results.length === 0) {
        historyContainer.innerHTML = '<p class="no-results">暂无测试记录</p>';
        return;
    }
    
    let html = '<div class="history-list">';
    results.forEach((result, index) => {
        const date = new Date(result.testTime);
        const formattedDate = `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        const duration = formatDuration(result.duration);
        
        html += `
            <div class="history-item" data-result-id="${result.id}">
                <div class="history-info">
                    <div class="history-title">${result.userInfo.nickname} - ${formattedDate}</div>
                    <div class="history-details">
                        用时：${duration} | 总均分：${result.scores.mean}
                    </div>
                </div>
                <button class="btn small" onclick="viewHistoryResult(${result.id})">查看详情</button>
            </div>
        `;
    });
    html += '</div>';
    
    historyContainer.innerHTML = html;
}

// 查看指定历史结果
function viewHistoryResult(resultId) {
    const results = getSavedTestResults();
    const result = results.find(r => r.id === resultId);
    
    if (!result) {
        alert('未找到该测试结果');
        return;
    }
    
    // 显示历史结果页面
    showHistoryResultPage(result);
}

// 显示历史结果页面
function showHistoryResultPage(result) {
    // 隐藏其他页面
    startScreen.classList.add('hidden');
    testScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');
    
    // 设置全局userInfo变量
    userInfo = result.userInfo;
    
    // 显示历史结果
    const endTime = new Date(result.testTime);
    showResults(result.scores, endTime, result.duration);
    
    // 修改页面标题和按钮
    document.querySelector('#result-screen h1').textContent = '历史测试结果';
    
    // 隐藏下载按钮，显示返回按钮
    const downloadButtons = document.querySelector('.download-buttons');
    downloadButtons.innerHTML = `
        <button id="back-to-history" class="btn primary">返回历史记录</button>
        <button id="back-to-home" class="btn secondary">返回首页</button>
    `;
    
    // 绑定返回按钮事件
    document.getElementById('back-to-history').addEventListener('click', () => {
        showHistoryScreen();
    });
    
    document.getElementById('back-to-home').addEventListener('click', () => {
        // 清除结果数据
        clearResultData();
        
        resultScreen.classList.add('hidden');
        startScreen.classList.remove('hidden');
        
        // 确保历史记录页面也被隐藏
        const historyScreen = document.getElementById('history-screen');
        if (historyScreen) {
            historyScreen.classList.add('hidden');
        }
        
        // 恢复原始按钮
        downloadButtons.innerHTML = `
            <button id="download-pdf" class="btn primary">下载PDF</button>
            <button id="download-image" class="btn secondary">下载图片</button>
            <button id="restart-test" class="btn">重新测试</button>
        `;
        bindResultButtons();
    });
}

// 显示历史记录页面
function showHistoryScreen() {
    startScreen.classList.add('hidden');
    testScreen.classList.add('hidden');
    resultScreen.classList.add('hidden');
    
    const historyScreen = document.getElementById('history-screen');
    if (!historyScreen) {
        // 创建历史记录页面
        const historyHtml = `
            <div id="history-screen" class="screen">
                <h1>往期测试记录</h1>
                <div id="history-results"></div>
                <div class="history-buttons">
                    <button id="back-to-start" class="btn primary">返回首页</button>
                    <button id="clear-test-data" class="btn">清空数据</button>
                </div>
            </div>
        `;
        document.querySelector('.container').insertAdjacentHTML('beforeend', historyHtml);
        
        // 绑定返回首页按钮
        document.getElementById('back-to-start').addEventListener('click', () => {
            // 清除结果数据
            clearResultData();
            
            document.getElementById('history-screen').classList.add('hidden');
            startScreen.classList.remove('hidden');
            
            // 确保结果页面也被隐藏
            resultScreen.classList.add('hidden');
        });
        
        // 绑定清空数据按钮
        document.getElementById('clear-test-data').addEventListener('click', () => {
            if (confirm('确定要清空所有测试数据吗？')) {
                localStorage.removeItem('testResults');
                showHistoryResults();
            }
        });
    } else {
        historyScreen.classList.remove('hidden');
    }
    
    showHistoryResults();
}

// 添加测试数据
function addTestData() {
    const testData = {
        id: Date.now(),
        userInfo: {
            nickname: '测试用户',
            age: 25,
            gender: '男',
            birthday: '1998-01-01',
            startTime: new Date(Date.now() - 300000).toISOString()
        },
        scores: {
            somatization: 1.2,
            obsessive: 1.5,
            interpersonal: 1.8,
            depression: 1.3,
            anxiety: 1.6,
            hostility: 1.1,
            phobic: 1.4,
            paranoid: 1.7,
            psychotic: 1.9,
            other: 1.0,
            total: 130,
            mean: 1.44
        },
        answers: Array(90).fill(0).map(() => Math.floor(Math.random() * 5)),
        testTime: new Date().toISOString(),
        duration: 300
    };
    
    let savedResults = JSON.parse(localStorage.getItem('testResults') || '[]');
    savedResults.unshift(testData);
    if (savedResults.length > 20) {
        savedResults = savedResults.slice(0, 20);
    }
    
    localStorage.setItem('testResults', JSON.stringify(savedResults));
    showHistoryResults();
    alert('测试数据已添加！');
}

// 下载图片
function downloadImage() {
    try {
        const resultContainer = document.querySelector('.result-container');
        
        // 创建canvas并绘制结果页面
        html2canvas(resultContainer, {
            scale: 2, // 提高清晰度
            useCORS: true,
            logging: false,
            backgroundColor: document.body.classList.contains('dark') ? '#121212' : '#ffffff'
        }).then(canvas => {
            // 创建下载链接
            const link = document.createElement('a');
            link.download = generateFileName('png');
            link.href = canvas.toDataURL('image/png');
            
            // 模拟点击下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }).catch(err => {
            console.error('图片生成失败:', err);
            alert('图片下载失败，请重试。');
        });
    } catch (error) {
        console.error('图片下载错误:', error);
        alert('图片下载功能需要额外的库支持，请重试。');
    }
}

// 生成文件名
function generateFileName(extension) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}年${month}月${day}日${userInfo.nickname}SCL-90测试结果.${extension}`;
}

// 重新测试
function restartTest() {
    // 重置变量
    currentQuestionIndex = 0;
    answers = [];
    timeLeft = 45 * 60;
    userInfo = {};
    testStartTime = null;
    
    // 重置表单
    userInfoForm.reset();
    
    // 清除结果页面显示的数据
    clearResultData();
    
    // 切换页面
    resultScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
}

// 绑定结果页面按钮事件
function bindResultButtons() {
    // 重新获取下载按钮元素
    const downloadPdfBtn = document.getElementById('download-pdf');
    const downloadImageBtn = document.getElementById('download-image');
    const restartTestBtn = document.getElementById('restart-test');
    
    // 重新绑定事件监听器
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', downloadPDF);
    }
    if (downloadImageBtn) {
        downloadImageBtn.addEventListener('click', downloadImage);
    }
    if (restartTestBtn) {
        restartTestBtn.addEventListener('click', restartTest);
    }
}

// 清除结果数据
function clearResultData() {
    //添加空值检查
    const resultNickname = document.getElementById('result-nickname');
    const resultTestTime = document.getElementById('result-test-time');
    const resultDuration = document.getElementById('result-duration');
    const resultAge = document.getElementById('result-age');
    const resultGender = document.getElementById('result-gender');
    const resultBirthday = document.getElementById('result-birthday');
    
    if (resultNickname) resultNickname.textContent = '--';
    if (resultTestTime) resultTestTime.textContent = '--';
    if (resultDuration) resultDuration.textContent = '--';
    if (resultAge) resultAge.textContent = '--';
    if (resultGender) resultGender.textContent = '--';
    if (resultBirthday) resultBirthday.textContent = '--';
    
    // 清除得分
    const scoreElements = [
        'score-somatization', 'score-obsessive', 'score-interpersonal', 
        'score-depression', 'score-anxiety', 'score-hostility', 
        'score-phobic', 'score-paranoid', 'score-psychotic', 
        'score-other', 'score-total', 'score-mean'
    ];
    
    scoreElements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '0';
            element.className = 'score-value';
        }
    });
    
    // 清除结果解释
    const resultInterpretation = document.getElementById('result-interpretation');
    if (resultInterpretation) {
        resultInterpretation.textContent = '请咨询专业心理医生获取详细解释。';
    }
    
    // 清除图表
    const chartCanvas = document.getElementById('result-chart');
    if (chartCanvas) {
        const ctx = chartCanvas.getContext('2d');
        ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
    }
    
    // 恢复页面标题
    const resultScreenH1 = document.querySelector('#result-screen h1');
    if (resultScreenH1) {
        resultScreenH1.textContent = '测试结果';
    }
}

// 用户数据本地存储功能
function loadUserData() {
    const savedData = localStorage.getItem('userData');
    if (savedData) {
        try {
            const userData = JSON.parse(savedData);
            
            // 填充表单
            if (userData.nickname) {
                document.getElementById('nickname').value = userData.nickname;
            }
            if (userData.birthday) {
                document.getElementById('birthday').value = userData.birthday;
                document.getElementById('birthday-input').value = formatBirthdayDisplay(userData.birthday);
            }
            if (userData.gender) {
                document.getElementById('gender').value = userData.gender;
            }
            
            console.log('用户数据已加载');
        } catch (error) {
            console.error('加载用户数据失败:', error);
        }
    }
}

function saveUserData(userInfo) {
    try {
        const userData = {
            nickname: userInfo.nickname,
            birthday: userInfo.birthday,
            gender: userInfo.gender,
            lastSaveTime: new Date().toISOString()
        };
        
        localStorage.setItem('userData', JSON.stringify(userData));
        console.log('用户数据已保存');
    } catch (error) {
        console.error('保存用户数据失败:', error);
    }
}

function formatBirthdayDisplay(birthdayString) {
    const date = new Date(birthdayString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

// 切换主题
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// 生日选择器功能
function initBirthdayPicker() {
    const birthdayInput = document.getElementById('birthday-input');
    const birthdayModal = document.getElementById('birthday-modal');
    const modalClose = document.querySelector('.modal-close');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    const prevYearBtn = document.getElementById('prev-year');
    const nextYearBtn = document.getElementById('next-year');
    const monthYear = document.getElementById('current-month-year');
    const calendarDays = document.getElementById('calendar-days');
    const cancelBtn = document.getElementById('cancel-birthday');
    const confirmBtn = document.getElementById('confirm-birthday');
    
    let currentDate = new Date();
    let selectedDate = null;
    
    // 点击生日输入框打开模态窗
    birthdayInput.addEventListener('click', () => {
        birthdayModal.style.display = 'flex';
        setTimeout(() => {
            birthdayModal.classList.add('show');
            renderCalendar();
        }, 10);
    });
    
    // 关闭模态窗
    modalClose.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    
    // 点击模态窗背景关闭
    birthdayModal.addEventListener('click', (e) => {
        if (e.target === birthdayModal) {
            closeModal();
        }
    });
    
    // ESC键关闭模态窗
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && birthdayModal.classList.contains('show')) {
            closeModal();
        }
    });
    
    // 月份导航
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // 年份导航
    prevYearBtn.addEventListener('click', () => {
        currentDate.setFullYear(currentDate.getFullYear() - 1);
        renderCalendar();
    });
    
    nextYearBtn.addEventListener('click', () => {
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        renderCalendar();
    });
    
    // 确认选择
    confirmBtn.addEventListener('click', () => {
        if (selectedDate) {
            updateBirthdayInput(selectedDate);
            closeModal();
        }
    });
    
    function closeModal() {
        birthdayModal.classList.remove('show');
        setTimeout(() => {
            birthdayModal.style.display = 'none';
            selectedDate = null;
        }, 300);
    }
    
    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // 更新月份年份显示
        monthYear.textContent = `${year}年${month + 1}月`;
        
        // 清空日历
        calendarDays.innerHTML = '';
        
        // 获取当月第一天和最后一天
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        // 生成42个日期格子（6周）
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = date.getDate();
            
            // 非当月日期样式
            if (date.getMonth() !== month) {
                dayElement.classList.add('other-month');
            }
            
            // 今天样式
            const today = new Date();
            if (date.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            // 选中日期样式
            if (selectedDate && date.toDateString() === selectedDate.toDateString()) {
                dayElement.classList.add('selected');
            }
            
            // 点击事件
            dayElement.addEventListener('click', () => {
                // 清除之前的选中状态
                document.querySelectorAll('.calendar-day').forEach(day => {
                    day.classList.remove('selected');
                });
                
                // 设置新的选中状态
                dayElement.classList.add('selected');
                selectedDate = new Date(date);
            });
            
            calendarDays.appendChild(dayElement);
        }
    }
    
    function updateBirthdayInput(date) {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        // 更新隐藏的生日数据字段
        document.getElementById('birthday').value = `${year}-${month}-${day}`;
        
        // 更新显示的输入框
        birthdayInput.value = `${year}年${date.getMonth() + 1}月${date.getDate()}日`;
    }
}

// 响应式调整
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(handleResize, 200); // 防抖处理
});

function handleResize() {
    // 响应式调整字体大小
    const isMobile = window.innerWidth < 768;
    const isSmallMobile = window.innerWidth < 480;
    
    // 调整按钮大小
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(btn => {
        if (isSmallMobile) {
            btn.style.padding = '10px 16px';
            btn.style.fontSize = '0.9rem';
        } else if (isMobile) {
            btn.style.padding = '11px 20px';
            btn.style.fontSize = '0.95rem';
        } else {
            btn.style.padding = '12px 24px';
            btn.style.fontSize = '1rem';
        }
    });
    
    // 调整进度信息显示
    const progressInfo = document.querySelector('.progress-info');
    if (progressInfo) {
        if (isSmallMobile) {
            progressInfo.style.fontSize = '0.8rem';
            progressInfo.style.flexDirection = 'column';
            progressInfo.style.gap = '3px';
        } else if (isMobile) {
            progressInfo.style.fontSize = '0.85rem';
            progressInfo.style.flexDirection = 'row';
        } else {
            progressInfo.style.fontSize = '0.9rem';
            progressInfo.style.flexDirection = 'row';
        }
    }
    
    // 检查是否在结果页面且图表已存在
    const resultScreen = document.getElementById('result-screen');
    const resultChart = document.getElementById('result-chart');
    
    if (!resultScreen.classList.contains('hidden') && resultChart) {
        // 如果需要，可以在这里重新绘制图表以适应新的屏幕尺寸
        // 注意：过于频繁的重绘可能影响性能
    }
}