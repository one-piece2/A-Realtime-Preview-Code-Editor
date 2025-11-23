import { useContext, useState } from 'react';
import { PlaygroundContext } from '../Context/playgroundcontent';
import { Typography, Card, Input, Button, Space, Alert } from 'antd';

const { Title, Paragraph, Text } = Typography;

// 实现无重复字符的最长子串算法
function lengthOfLongestSubstring(s: string): number {
  // 使用滑动窗口和哈希集合
  const charSet = new Set<string>();
  let left = 0; // 左指针
  let maxLength = 0;
  
  for (let right = 0; right < s.length; right++) {
    // 如果当前字符已经在集合中，移动左指针直到移除重复字符
    while (charSet.has(s[right])) {
      charSet.delete(s[left]);
      left++;
    }
    
    // 添加当前字符到集合中
    charSet.add(s[right]);
    
    // 更新最长长度
    maxLength = Math.max(maxLength, right - left + 1);
  }
  
  return maxLength;
}

// 可视化算法过程的函数
function visualizeAlgorithm(s: string): { step: string; window: string; length: number }[] {
  const steps = [];
  const charSet = new Set<string>();
  let left = 0;
  let maxLength = 0;
  
  for (let right = 0; right < s.length; right++) {
    // 记录当前步骤信息
    const currentWindow = s.substring(left, right + 1);
    
    if (charSet.has(s[right])) {
      steps.push({
        step: `发现重复字符 '${s[right]}'，移除窗口中重复字符及其之前的字符`,
        window: currentWindow,
        length: right - left + 1
      });
      
      // 移动左指针直到移除重复字符
      while (charSet.has(s[right])) {
        charSet.delete(s[left]);
        left++;
      }
    } else {
      steps.push({
        step: `将字符 '${s[right]}' 添加到窗口`,
        window: currentWindow,
        length: right - left + 1
      });
    }
    
    // 添加当前字符到集合中
    charSet.add(s[right]);
    
    // 更新最长长度
    maxLength = Math.max(maxLength, right - left + 1);
    
    steps.push({
      step: `当前窗口: '${s.substring(left, right + 1)}'，当前长度: ${right - left + 1}，最长长度: ${maxLength}`,
      window: s.substring(left, right + 1),
      length: maxLength
    });
  }
  
  return steps;
}

export default function LeetCode() {
  const { theme } = useContext(PlaygroundContext);
  const [inputValue, setInputValue] = useState<string>('abcabcbb');
  const [result, setResult] = useState<number | null>(null);
  const [algorithmSteps, setAlgorithmSteps] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // 根据主题定义样式
  const themeStyles = {
      container: {
        backgroundColor: theme === 'dark' ? '#111827' : '#f9fafb',
        color: theme === 'dark' ? '#f3f4f6' : '#111827',
        transition: 'background-color 0.3s, color 0.3s',
        height: '100vh',
        overflow: 'hidden'
      },
      contentWrapper: {
        maxHeight: 'calc(100vh - 100px)',
        overflowY: 'auto' as const,
        padding: '16px'
      },
      header: {
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderBottom: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
      },
      title: {
        color: theme === 'dark' ? '#ffffff' : '#111827'
      },
      subtitle: {
        color: theme === 'dark' ? '#9ca3af' : '#6b7280'
      },
      card: {
        backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
        borderColor: theme === 'dark' ? '#374151' : '#e5e7eb'
      },
      paragraph: {
        color: theme === 'dark' ? '#d1d5db' : '#4b5563'
      },
      code: {
        backgroundColor: theme === 'dark' ? '#111827' : '#f3f4f6',
        color: theme === 'dark' ? '#d1d5db' : '#111827',
        border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`
      },
      input: {
        backgroundColor: theme === 'dark' ? '#374151' : '#ffffff',
        borderColor: theme === 'dark' ? '#4b5563' : '#d1d5db',
        color: theme === 'dark' ? '#ffffff' : '#111827'
      },
      button: {
        backgroundColor: theme === 'dark' ? '#3b82f6' : '#2563eb'
      },
      buttonHover: {
        backgroundColor: theme === 'dark' ? '#2563eb' : '#1d4ed8'
      },
      stepContainer: {
        backgroundColor: theme === 'dark' ? '#374151' : '#f9fafb'
      },
      stepItem: {
        backgroundColor: theme === 'dark' ? '#111827' : '#f3f4f6'
      },
      exampleContainer: {
        backgroundColor: theme === 'dark' ? '#111827' : '#f3f4f6'
      },
      difficultyBadge: {
        backgroundColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)',
        color: theme === 'dark' ? '#93c5fd' : '#1e40af'
      },
      // 滚动条样式对象，供其他需要隐藏滚动条的元素使用
      noScrollbar: {}
    };
  
  return (
      <div style={themeStyles.container}>
        {/* 题目头部 */}
        <div style={{
          ...themeStyles.header,
          padding: '16px 20px',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} className="md:flex-row md:items-center md:justify-between">
              <div>
                <Title level={1} style={{
                  margin: 0,
                  ...themeStyles.title,
                  fontSize: '24px'
                }}>
                  3. 无重复字符的最长子串
                </Title>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    ...themeStyles.difficultyBadge
                  }}>
                    中等
                  </span>
                  <Text style={themeStyles.subtitle}>
                    相关标签: 哈希表, 字符串, 滑动窗口
                  </Text>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: themeStyles.subtitle.color }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 1V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M1 8H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <span>通过率 45.8%</span>
                </span>
                <span>提交次数 4M+</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 主要内容 - 带滚动条 */}
        
        <div style={themeStyles.contentWrapper}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            {/* 交互式输入和计算区域 */}
            <Card style={{ 
              ...themeStyles.card,
              marginBottom: '24px',
              border: `1px solid ${themeStyles.card.borderColor}`
            }}>
              <Title level={3} style={{ 
                marginBottom: '16px',
                ...themeStyles.title
              }}>解决问题</Title>
              
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <Text style={{ ...themeStyles.paragraph, marginBottom: '8px', display: 'block' }}>输入字符串:</Text>
                    <Input
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        setError(null);
                      }}
                      placeholder="请输入一个字符串"
                      style={themeStyles.input}
                      maxLength={100}
                    />
                  </div>
                  
                  <Button 
                    type="primary" 
                    onClick={() => {
                      try {
                        const res = lengthOfLongestSubstring(inputValue);
                        setResult(res);
                        setAlgorithmSteps(visualizeAlgorithm(inputValue));
                        setError(null);
                      } catch (err) {
                        setError('计算过程中出现错误，请检查输入');
                        setResult(null);
                        setAlgorithmSteps([]);
                      }
                    }}
                    size="large"
                    style={{...themeStyles.button, transition: 'background-color 0.3s'}}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = themeStyles.buttonHover.backgroundColor;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = themeStyles.button.backgroundColor;
                    }}
                  >
                    计算最长无重复子串长度
                  </Button>
                </div>
                
                {error && (
                  <Alert
                    message="错误"
                    description={error}
                    type="error"
                    showIcon
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: theme === 'dark' ? '#f87171' : '#b91c1c',
                      borderColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)'
                    }}
                  />
                )}
                
                {result !== null && (
                  <Alert
                    message="计算结果"
                    description={`无重复字符的最长子串长度为: ${result}`}
                    type="success"
                    showIcon
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      color: theme === 'dark' ? '#6ee7b7' : '#15803d',
                      borderColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(34, 197, 94, 0.3)'
                    }}
                  />
                )}
                
                {algorithmSteps.length > 0 && (
                  <div style={{ 
                    marginTop: '16px', 
                    padding: '16px', 
                    borderRadius: '8px',
                    ...themeStyles.stepContainer
                  }}>
                    <Text style={{ fontWeight: '600', display: 'block', marginBottom: '8px', ...themeStyles.title }}>算法执行步骤:</Text>
                    <div style={{ 
                    maxHeight: '256px', 
                    overflowY: 'auto', 
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${themeStyles.card.borderColor}`,
                    backgroundColor: themeStyles.card.backgroundColor,
                    // 隐藏滚动条
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }} className="no-scrollbar">
                      {algorithmSteps.map((step, index) => (
                        <div 
                          key={index} 
                          style={{ 
                            padding: '8px', 
                            marginBottom: '8px', 
                            borderRadius: '6px',
                            ...themeStyles.stepItem
                          }}
                        >
                          <Text style={themeStyles.paragraph}>
                            步骤 {index + 1}: {step.step}
                          </Text>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Space>
            </Card>
            
            <Card style={{ 
              ...themeStyles.card,
              marginBottom: '24px',
              border: `1px solid ${themeStyles.card.borderColor}`
            }}>
              <Title level={3} style={{ 
                marginBottom: '16px',
                ...themeStyles.title
              }}>题目描述</Title>
              <Paragraph style={{ 
                ...themeStyles.paragraph,
                marginBottom: '16px'
              }}>
                给定一个字符串 s ，请你找出其中不含有重复字符的最长子串的长度。
              </Paragraph>
            </Card>
            
            <Card style={{ 
              ...themeStyles.card,
              marginBottom: '24px',
              border: `1px solid ${themeStyles.card.borderColor}`
            }}>
              <Title level={3} style={{ 
                marginBottom: '16px',
                ...themeStyles.title
              }}>示例 1</Title>
              <div style={{ 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '16px',
                ...themeStyles.exampleContainer
              }}>
                <Paragraph style={{ marginBottom: '8px', fontWeight: '600', ...themeStyles.paragraph }}>输入：</Paragraph>
                <code style={{ 
                  display: 'block', 
                  padding: '8px', 
                  borderRadius: '6px',
                  ...themeStyles.code
                }}>
                  s = "abcabcbb"
                </code>
                <Paragraph style={{ marginBottom: '8px', fontWeight: '600', marginTop: '16px', ...themeStyles.paragraph }}>输出：</Paragraph>
                <code style={{ 
                  display: 'block', 
                  padding: '8px', 
                  borderRadius: '6px',
                  ...themeStyles.code
                }}>
                  3
                </code>
                <Paragraph style={{ 
                  marginTop: '16px',
                  ...themeStyles.subtitle
                }}>
                  解释：因为无重复字符的最长子串是 "abc"，所以其长度为 3。注意 "bca" 和 "cab" 也是正确答案。
                </Paragraph>
              </div>
              
              <Title level={3} style={{ 
                marginBottom: '16px',
                ...themeStyles.title
              }}>示例 2</Title>
              <div style={{ 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '16px',
                ...themeStyles.exampleContainer
              }}>
                <Paragraph style={{ marginBottom: '8px', fontWeight: '600', ...themeStyles.paragraph }}>输入：</Paragraph>
                <code style={{ 
                  display: 'block', 
                  padding: '8px', 
                  borderRadius: '6px',
                  ...themeStyles.code
                }}>
                  s = "bbbbb"
                </code>
                <Paragraph style={{ marginBottom: '8px', fontWeight: '600', marginTop: '16px', ...themeStyles.paragraph }}>输出：</Paragraph>
                <code style={{ 
                  display: 'block', 
                  padding: '8px', 
                  borderRadius: '6px',
                  ...themeStyles.code
                }}>
                  1
                </code>
                <Paragraph style={{ 
                  marginTop: '16px',
                  ...themeStyles.subtitle
                }}>
                  解释：因为无重复字符的最长子串是 "b"，所以其长度为 1。
                </Paragraph>
              </div>
              
              <Title level={3} style={{ 
                marginBottom: '16px',
                ...themeStyles.title
              }}>示例 3</Title>
              <div style={{ 
                borderRadius: '8px', 
                padding: '16px', 
                marginBottom: '16px',
                ...themeStyles.exampleContainer
              }}>
                <Paragraph style={{ marginBottom: '8px', fontWeight: '600', ...themeStyles.paragraph }}>输入：</Paragraph>
                <code style={{ 
                  display: 'block', 
                  padding: '8px', 
                  borderRadius: '6px',
                  ...themeStyles.code
                }}>
                  s = "pwwkew"
                </code>
                <Paragraph style={{ marginBottom: '8px', fontWeight: '600', marginTop: '16px', ...themeStyles.paragraph }}>输出：</Paragraph>
                <code style={{ 
                  display: 'block', 
                  padding: '8px', 
                  borderRadius: '6px',
                  ...themeStyles.code
                }}>
                  3
                </code>
                <Paragraph style={{ 
                  marginTop: '16px',
                  ...themeStyles.subtitle
                }}>
                  解释：因为无重复字符的最长子串是 "wke"，所以其长度为 3。请注意，你的答案必须是子串的长度，"pwke" 是一个子序列，不是子串。
                </Paragraph>
              </div>
            </Card>
            
            <Card style={{ 
              ...themeStyles.card,
              border: `1px solid ${themeStyles.card.borderColor}`
            }}>
              <Title level={3} style={{ 
                marginBottom: '16px',
                ...themeStyles.title
              }}>提示</Title>
              <ul style={{ 
                listStyleType: 'disc', 
                paddingLeft: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px'
              }}>
                <li style={themeStyles.paragraph}>0 ≤ s.length ≤ 5 * 10<sup>4</sup></li>
                <li style={themeStyles.paragraph}>s 由英文字母、数字、符号和空格组成</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
  );
}