import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { WordCard, WordBook } from '../types/database'

export const useSupabase = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.from('word_books').select('count')
      
      if (error) {
        throw error
      }
      
      console.log('Supabase connection successful')
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed'
      setError(errorMessage)
      console.error('Supabase connection error:', errorMessage)
      return false
    } finally {
      setLoading(false)
    }
  }

  const createWordBook = async (name: string, description?: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('word_books')
        .insert([{ name, description }])
        .select()
        .single()
      
      if (error) throw error
      
      return data as WordBook
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create word book'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const getWordBooks = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('word_books')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return data as WordBook[]
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch word books'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  const createWordCard = async (wordCardData: Omit<WordCard, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data, error } = await supabase
        .from('word_cards')
        .insert([wordCardData])
        .select()
        .single()
      
      if (error) throw error
      
      return data as WordCard
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create word card'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    testConnection,
    createWordBook,
    getWordBooks,
    createWordCard
  }
}